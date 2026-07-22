import ExperienceBadge from './ExperienceBadge';

export const OneYearTier = {
  component: ExperienceBadge,
  props: { metadata: { indoorExperienceYears: '1' } },
  group: 'misc',
};

export const TwoYearsTier = {
  component: ExperienceBadge,
  props: { metadata: { indoorExperienceYears: '2' } },
  group: 'misc',
};

export const ThreeYearsTier = {
  component: ExperienceBadge,
  props: { metadata: { indoorExperienceYears: '3' } },
  group: 'misc',
};
