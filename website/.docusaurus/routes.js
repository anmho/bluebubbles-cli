import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/bluebubbles-cli/',
    component: ComponentCreator('/bluebubbles-cli/', '480'),
    routes: [
      {
        path: '/bluebubbles-cli/',
        component: ComponentCreator('/bluebubbles-cli/', '0d0'),
        routes: [
          {
            path: '/bluebubbles-cli/',
            component: ComponentCreator('/bluebubbles-cli/', 'a49'),
            routes: [
              {
                path: '/bluebubbles-cli/api',
                component: ComponentCreator('/bluebubbles-cli/api', '7d2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/add-participant-to-chat',
                component: ComponentCreator('/bluebubbles-cli/api/add-participant-to-chat', 'f38'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/bluebubbles',
                component: ComponentCreator('/bluebubbles-cli/api/bluebubbles', '1ac'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/check-for-server-update',
                component: ComponentCreator('/bluebubbles-cli/api/check-for-server-update', 'dd6'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/create-new-chat',
                component: ComponentCreator('/bluebubbles-cli/api/create-new-chat', '5f1'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/delete-chat',
                component: ComponentCreator('/bluebubbles-cli/api/delete-chat', '0ad'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/delete-scheduled-message-by-id',
                component: ComponentCreator('/bluebubbles-cli/api/delete-scheduled-message-by-id', 'c83'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/delete-settings',
                component: ComponentCreator('/bluebubbles-cli/api/delete-settings', '136'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/delete-theme',
                component: ComponentCreator('/bluebubbles-cli/api/delete-theme', '399'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/download-attachment',
                component: ComponentCreator('/bluebubbles-cli/api/download-attachment', 'aac'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/edit-message',
                component: ComponentCreator('/bluebubbles-cli/api/edit-message', 'ccf'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/force-download-attachment',
                component: ComponentCreator('/bluebubbles-cli/api/force-download-attachment', '264'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-account-info',
                component: ComponentCreator('/bluebubbles-cli/api/get-account-info', '05f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-alerts',
                component: ComponentCreator('/bluebubbles-cli/api/get-alerts', 'b47'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-attachment-blurhash',
                component: ComponentCreator('/bluebubbles-cli/api/get-attachment-blurhash', '940'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-attachment-by-guid',
                component: ComponentCreator('/bluebubbles-cli/api/get-attachment-by-guid', '285'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-attachment-count',
                component: ComponentCreator('/bluebubbles-cli/api/get-attachment-count', '920'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-attachment-live-photo',
                component: ComponentCreator('/bluebubbles-cli/api/get-attachment-live-photo', 'ebe'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-chat-by-guid',
                component: ComponentCreator('/bluebubbles-cli/api/get-chat-by-guid', '790'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-chat-count',
                component: ComponentCreator('/bluebubbles-cli/api/get-chat-count', '254'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-chat-messages',
                component: ComponentCreator('/bluebubbles-cli/api/get-chat-messages', 'abc'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-contact-card',
                component: ComponentCreator('/bluebubbles-cli/api/get-contact-card', '550'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-contact-share-status',
                component: ComponentCreator('/bluebubbles-cli/api/get-contact-share-status', '654'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-contacts',
                component: ComponentCreator('/bluebubbles-cli/api/get-contacts', '793'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-face-time-availability',
                component: ComponentCreator('/bluebubbles-cli/api/get-face-time-availability', '107'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-fcm-client-config',
                component: ComponentCreator('/bluebubbles-cli/api/get-fcm-client-config', 'a8c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-find-my-devices-locations',
                component: ComponentCreator('/bluebubbles-cli/api/get-find-my-devices-locations', '7d8'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-find-my-friends-locations',
                component: ComponentCreator('/bluebubbles-cli/api/get-find-my-friends-locations', '3e4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-handle-by-address',
                component: ComponentCreator('/bluebubbles-cli/api/get-handle-by-address', '52f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-handle-count',
                component: ComponentCreator('/bluebubbles-cli/api/get-handle-count', 'bf6'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-handles-focus-status',
                component: ComponentCreator('/bluebubbles-cli/api/get-handles-focus-status', '1c9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-i-message-availability',
                component: ComponentCreator('/bluebubbles-cli/api/get-i-message-availability', 'a08'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-i-message-entity-totals',
                component: ComponentCreator('/bluebubbles-cli/api/get-i-message-entity-totals', '3a4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-landing-page',
                component: ComponentCreator('/bluebubbles-cli/api/get-landing-page', '0dc'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-media-totals',
                component: ComponentCreator('/bluebubbles-cli/api/get-media-totals', 'd44'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-media-totals-per-chat',
                component: ComponentCreator('/bluebubbles-cli/api/get-media-totals-per-chat', 'f38'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-message-by-guid',
                component: ComponentCreator('/bluebubbles-cli/api/get-message-by-guid', '85a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-message-count',
                component: ComponentCreator('/bluebubbles-cli/api/get-message-count', '581'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-messages-embedded-media',
                component: ComponentCreator('/bluebubbles-cli/api/get-messages-embedded-media', 'd31'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-my-sent-message-count',
                component: ComponentCreator('/bluebubbles-cli/api/get-my-sent-message-count', 'dfa'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-scheduled-message-by-id',
                component: ComponentCreator('/bluebubbles-cli/api/get-scheduled-message-by-id', '285'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-scheduled-messages',
                component: ComponentCreator('/bluebubbles-cli/api/get-scheduled-messages', 'dff'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-server-logs',
                component: ComponentCreator('/bluebubbles-cli/api/get-server-logs', '2bc'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-server-metadata',
                component: ComponentCreator('/bluebubbles-cli/api/get-server-metadata', 'f4f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-settings',
                component: ComponentCreator('/bluebubbles-cli/api/get-settings', '84d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/get-themes',
                component: ComponentCreator('/bluebubbles-cli/api/get-themes', 'ade'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/install-server-update',
                component: ComponentCreator('/bluebubbles-cli/api/install-server-update', 'e1b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/leave-chat',
                component: ComponentCreator('/bluebubbles-cli/api/leave-chat', 'ae1'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/lock-mac',
                component: ComponentCreator('/bluebubbles-cli/api/lock-mac', 'd90'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/mark-alert-as-read',
                component: ComponentCreator('/bluebubbles-cli/api/mark-alert-as-read', 'ed6'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/mark-chat-as-read',
                component: ComponentCreator('/bluebubbles-cli/api/mark-chat-as-read', '81d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/mark-chat-as-unread',
                component: ComponentCreator('/bluebubbles-cli/api/mark-chat-as-unread', 'd3a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/modify-active-alias',
                component: ComponentCreator('/bluebubbles-cli/api/modify-active-alias', '8e6'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/notify-for-silenced-message',
                component: ComponentCreator('/bluebubbles-cli/api/notify-for-silenced-message', '22d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/ping',
                component: ComponentCreator('/bluebubbles-cli/api/ping', '43a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/query-chats',
                component: ComponentCreator('/bluebubbles-cli/api/query-chats', 'a39'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/query-contacts',
                component: ComponentCreator('/bluebubbles-cli/api/query-contacts', 'a46'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/query-handles',
                component: ComponentCreator('/bluebubbles-cli/api/query-handles', '8b8'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/query-messages',
                component: ComponentCreator('/bluebubbles-cli/api/query-messages', '104'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/refresh-find-my-devices',
                component: ComponentCreator('/bluebubbles-cli/api/refresh-find-my-devices', '67d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/refresh-find-my-friends',
                component: ComponentCreator('/bluebubbles-cli/api/refresh-find-my-friends', 'b9c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/register-device',
                component: ComponentCreator('/bluebubbles-cli/api/register-device', 'e7a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/remove-group-icon',
                component: ComponentCreator('/bluebubbles-cli/api/remove-group-icon', 'c6e'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/remove-participant-from-chat',
                component: ComponentCreator('/bluebubbles-cli/api/remove-participant-from-chat', 'f90'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/restart-server',
                component: ComponentCreator('/bluebubbles-cli/api/restart-server', 'b92'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/restart-services',
                component: ComponentCreator('/bluebubbles-cli/api/restart-services', 'e92'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/save-settings',
                component: ComponentCreator('/bluebubbles-cli/api/save-settings', 'eaf'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/save-theme',
                component: ComponentCreator('/bluebubbles-cli/api/save-theme', '505'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/schedule-a-message',
                component: ComponentCreator('/bluebubbles-cli/api/schedule-a-message', '75c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/send-attachment',
                component: ComponentCreator('/bluebubbles-cli/api/send-attachment', 'dcd'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/send-multipart-message',
                component: ComponentCreator('/bluebubbles-cli/api/send-multipart-message', '754'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/send-reaction',
                component: ComponentCreator('/bluebubbles-cli/api/send-reaction', '1be'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/send-text',
                component: ComponentCreator('/bluebubbles-cli/api/send-text', 'ca3'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/set-group-icon',
                component: ComponentCreator('/bluebubbles-cli/api/set-group-icon', 'e6b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/share-contact-info',
                component: ComponentCreator('/bluebubbles-cli/api/share-contact-info', '08c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/start-send-typing-indicator',
                component: ComponentCreator('/bluebubbles-cli/api/start-send-typing-indicator', '3f7'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/stop-send-typing-indicator',
                component: ComponentCreator('/bluebubbles-cli/api/stop-send-typing-indicator', '0c2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/unsend-message',
                component: ComponentCreator('/bluebubbles-cli/api/unsend-message', 'd36'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/update-a-chat',
                component: ComponentCreator('/bluebubbles-cli/api/update-a-chat', '1db'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/update-a-scheduled-message-by-id',
                component: ComponentCreator('/bluebubbles-cli/api/update-a-scheduled-message-by-id', '3ca'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/api/upload-attachment',
                component: ComponentCreator('/bluebubbles-cli/api/upload-attachment', '5b2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/cli-reference',
                component: ComponentCreator('/bluebubbles-cli/cli-reference', 'c89'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/development',
                component: ComponentCreator('/bluebubbles-cli/development', 'a75'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/doctor',
                component: ComponentCreator('/bluebubbles-cli/doctor', '17f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/local-server',
                component: ComponentCreator('/bluebubbles-cli/local-server', '81a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/quickstart',
                component: ComponentCreator('/bluebubbles-cli/quickstart', '24f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/webhooks',
                component: ComponentCreator('/bluebubbles-cli/webhooks', '238'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/bluebubbles-cli/',
                component: ComponentCreator('/bluebubbles-cli/', '755'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
