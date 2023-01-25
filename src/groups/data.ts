

import validator from 'validator';
import nconf from 'nconf';

import db from '../database';
import plugins from '../plugins';
import utils from '../utils';
import translator from '../translator';
import coverPhoto from '../coverPhoto';

const intFields = [
    'createtime', 'memberCount', 'hidden', 'system', 'private',
    'userTitleEnabled', 'disableJoinRequests', 'disableLeave',
];

interface Groups {
    getGroupsFields: (groupNames: string[], fields: string | string[]) => Promise<Groups[]>;
    getGroupsData: (groupName: string[]) => Promise<Groups[]>;
    getGroupData: (groupName: string) => Promise<Groups>;
    getGroupField: (groupName: string, field: string) => Promise<groupField>;
    getGroupFields: (groupName: string, fields: string | string[]) => Promise<Groups>;
    setGroupField: (groupName: string, field: string, value: string) => Promise<void>;
    ephemeralGroups: string[];
    getEphemeralGroup: (groupName: string) => Promise<Groups>;
}

interface Group {
    name: string;
    slug: string;
    createtime: number;
    userTitle: string;
    userTitleEscaped: number;
    userTitleEnabled: number;
    description: string;
    memberCount: number;
    hidden: number;
    system: number;
    private: number;
    disableJoinRequests: number;
    disableLeave: number;
    'cover:url': string;
    'cover:thumb:url': string;
    'cover:position': string;
    nameEncoded: string;
    displayName: string;
    labelColor: string;
    textColor: string;
    icon: string;
    createtimeISO: string;
    memberPostCids: string;
    memberPostCidsArray: number[];
  }

type groupField = string;

function escapeGroupData(group: Group) {
    if (group) {
        group.nameEncoded = encodeURIComponent(group.name);
        group.displayName = validator.escape(String(group.name));
        group.description = validator.escape(String(group.description || ''));
        group.userTitle = validator.escape(String(group.userTitle || ''));
        group.userTitleEscaped = translator.escape(group.userTitle);
    }
}

function modifyGroup(group: Group, fields: string | string[]) {
    if (group) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        db.parseIntFields(group, intFields, fields);

        escapeGroupData(group);
        group.userTitleEnabled = ([null, undefined].includes(group.userTitleEnabled)) ? 1 : group.userTitleEnabled;
        group.labelColor = validator.escape(String(group.labelColor || '#000000'));
        group.textColor = validator.escape(String(group.textColor || '#ffffff'));
        group.icon = validator.escape(String(group.icon || ''));
        group.createtimeISO = utils.toISOString(group.createtime) as string;
        group.private = ([null, undefined].includes(group.private)) ? 1 : group.private;
        group.memberPostCids = group.memberPostCids || '';
        group.memberPostCidsArray = group.memberPostCids.split(',').map(cid => parseInt(cid, 10)).filter(Boolean);

        group['cover:thumb:url'] = group['cover:thumb:url'] || group['cover:url'];

        if (group['cover:url']) {
            group['cover:url'] = group['cover:url'].startsWith('http') ? group['cover:url'] : (nconf.get('relative_path') as string + group['cover:url']);
        } else {
            group['cover:url'] = coverPhoto.getDefaultGroupCover(group.name);
        }

        if (group['cover:thumb:url']) {
            group['cover:thumb:url'] = group['cover:thumb:url'].startsWith('http') ? group['cover:thumb:url'] : (nconf.get('relative_path') as string + group['cover:thumb:url']);
        } else {
            group['cover:thumb:url'] = coverPhoto.getDefaultGroupCover(group.name);
        }

        group['cover:position'] = validator.escape(String(group['cover:position'] || '50% 50%'));
    }
}

export = function (Groups: Groups) {
    Groups.getGroupsFields = async function (groupNames, fields) {
        if (!Array.isArray(groupNames) || !groupNames.length) {
            return [];
        }

        const ephemeralIdx = groupNames.reduce((memo: number[], cur: string, idx: number) => {
            if (Groups.ephemeralGroups.includes(cur)) {
                memo.push(idx);
            }
            return memo;
        }, []);

        const keys = groupNames.map(groupName => `group:${groupName}`);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const groupData: Group = await db.getObjects(keys, fields);
        if (ephemeralIdx.length) {
            ephemeralIdx.forEach((idx) => {
                groupData[idx] = Groups.getEphemeralGroup(groupNames[idx]);
            });
        }

        modifyGroup(groupData, fields);

        const results = await plugins.hooks.fire('filter:groups.get', { groups: groupData });
        return results.groups;
    };

    Groups.getGroupsData = async function (groupNames) {
        return await Groups.getGroupsFields(groupNames, []);
    };

    Groups.getGroupData = async function (groupName) {
        const groupsData = await Groups.getGroupsData([groupName]);
        return Array.isArray(groupsData) && groupsData[0] ? groupsData[0] : null;
    };

    Groups.getGroupField = async function (groupName, field) {
        const groupData = await Groups.getGroupFields(groupName, [field]);
        return groupData ? groupData[field] : null;
    };

    Groups.getGroupFields = async function (groupName, fields) {
        const groups = await Groups.getGroupsFields([groupName], fields);
        return groups ? groups[0] : null;
    };

    Groups.setGroupField = async function (groupName, field, value) {
        await db.setObjectField(`group:${groupName}`, field, value);
        plugins.hooks.fire('action:group.set', { field: field, value: value, type: 'set' });
    };
};

