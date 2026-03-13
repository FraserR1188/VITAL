export const categories = [
  { id: 'all', label: 'All', accent: '#ff6b35' },
  { id: 'achievement', label: 'Achievement', accent: '#ffd166' },
  { id: 'kindness', label: 'Kindness', accent: '#ff6b9d' },
  { id: 'personal', label: 'Personal', accent: '#a78bfa' },
  { id: 'fitness', label: 'Fitness', accent: '#06d6a0' },
]

export const organisation = {
  name: 'MMC Seaton Delaval',
  slug: 'mmc-seaton-delaval',
  members: 42,
  invitesPending: 6,
}

export const signedInUser = {
  name: 'Rob Fraser',
  role: 'Founder / Product Lead',
  initials: 'RF',
  beamsGiven: 18,
  beamsReceived: 27,
}

export const feedPosts = [
  {
    id: 1,
    author: 'Lauren Bell',
    role: 'Process Scientist',
    initials: 'LB',
    category: 'achievement',
    time: '12 mins ago',
    content:
      'Passed the final validation checkpoint for the clean-room handover today. Huge thanks to @Aisha Khan and @Tom Reed for keeping every detail tight.',
    reactions: { cheer: 14, heart: 6, fire: 9 },
    comments: 5,
  },
  {
    id: 2,
    author: 'Aisha Khan',
    role: 'Quality Specialist',
    initials: 'AK',
    category: 'kindness',
    time: '48 mins ago',
    content:
      'Shoutout to the late team for staying behind and helping a new starter feel confident before tomorrow’s batch run. Exactly the culture we want more of.',
    reactions: { cheer: 21, heart: 18, fire: 3 },
    comments: 7,
  },
  {
    id: 3,
    author: 'Tom Reed',
    role: 'Manufacturing Technician',
    initials: 'TR',
    category: 'personal',
    time: 'Today at 09:14',
    content:
      'Sleepless but smiling. Our little girl arrived this morning and the Beam family has already made us feel unbelievably supported.',
    reactions: { cheer: 31, heart: 42, fire: 4 },
    comments: 16,
  },
  {
    id: 4,
    author: 'Mina Patel',
    role: 'Operations Analyst',
    initials: 'MP',
    category: 'fitness',
    time: 'Yesterday',
    content:
      'First 10K done. Legs are broken, morale is elite. Who is joining me for a Beam running club in V2?',
    reactions: { cheer: 17, heart: 11, fire: 12 },
    comments: 8,
  },
]

export const notifications = [
  { id: 1, label: 'Lauren reacted with Cheer to your post', time: '2m', unread: true },
  { id: 2, label: 'Aisha mentioned you in a Beam', time: '18m', unread: true },
  { id: 3, label: 'Tom commented on your certification post', time: '1h', unread: false },
]

export const team = [
  { id: 1, name: 'Lauren Bell', role: 'Process Scientist', initials: 'LB', given: 14, received: 19 },
  { id: 2, name: 'Aisha Khan', role: 'Quality Specialist', initials: 'AK', given: 22, received: 17 },
  { id: 3, name: 'Tom Reed', role: 'Manufacturing Technician', initials: 'TR', given: 9, received: 24 },
  { id: 4, name: 'Mina Patel', role: 'Operations Analyst', initials: 'MP', given: 16, received: 13 },
]
