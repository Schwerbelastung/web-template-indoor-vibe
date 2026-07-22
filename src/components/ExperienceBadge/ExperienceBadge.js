import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';

import css from './ExperienceBadge.module.css';

// The badge is granted by the marketplace operator in Console by setting profile
// metadata: { "indoorExperienceYears": "1" | "2" | "3" } (see docs/BADGES.md).
// Metadata is operator-only writable, so users can't grant the badge to themselves.
const VALID_TIERS = ['1', '2', '3'];
const TIER_CONFIG = {
  '1': { messageId: 'ExperienceBadge.oneYear', tierClass: 'tierBronze' },
  '2': { messageId: 'ExperienceBadge.twoYears', tierClass: 'tierSilver' },
  '3': { messageId: 'ExperienceBadge.threeYears', tierClass: 'tierGold' },
};

const IconBike = () => (
  <svg
    className={css.icon}
    width="16"
    height="12"
    viewBox="0 0 16 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="3.2" cy="8.6" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="12.8" cy="8.6" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M3.2 8.6 L5.9 3.4 H9.8 M6.1 3.4 L8.6 8.6 H12.8 M9.8 3.4 L12.8 8.6 M4.9 1.6 H6.9 M9.3 1.6 L9.8 3.4"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * An indoor-biking experience badge, granted by the marketplace operator.
 *
 * Renders a small pill when the given profile metadata contains a valid
 * indoorExperienceYears value ("1", "2" or "3"); renders nothing otherwise.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {Object} [props.metadata] - The user's profile metadata (user.attributes.profile.metadata)
 * @returns {JSX.Element|null} experience badge pill, or null when the user has no valid badge
 */
const ExperienceBadge = props => {
  const { rootClassName, className, metadata } = props;
  const years = metadata?.indoorExperienceYears;
  const tierKey = typeof years === 'number' ? String(years) : years;
  const tier = VALID_TIERS.includes(tierKey) ? TIER_CONFIG[tierKey] : null;

  if (!tier) {
    return null;
  }

  const classes = classNames(rootClassName || css.root, css[tier.tierClass], className);

  return (
    <span className={classes} data-testid="experience-badge">
      <IconBike />
      <FormattedMessage id={tier.messageId} />
    </span>
  );
};

export default ExperienceBadge;
