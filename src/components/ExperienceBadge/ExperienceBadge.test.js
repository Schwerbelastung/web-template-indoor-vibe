import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import ExperienceBadge from './ExperienceBadge';

const { screen } = testingLibrary;

// Note: the test environment renders each microcopy message as its own key
// (see testMessages in util/testHelpers.js), so assertions target keys, not English texts.
describe('ExperienceBadge', () => {
  it('renders the bronze tier for 1 year', () => {
    render(<ExperienceBadge metadata={{ indoorExperienceYears: '1' }} />);
    expect(screen.getByText('ExperienceBadge.oneYear')).toBeInTheDocument();
  });

  it('renders the silver tier for 2 years', () => {
    render(<ExperienceBadge metadata={{ indoorExperienceYears: '2' }} />);
    expect(screen.getByText('ExperienceBadge.twoYears')).toBeInTheDocument();
  });

  it('renders the gold tier for 3 years', () => {
    render(<ExperienceBadge metadata={{ indoorExperienceYears: '3' }} />);
    expect(screen.getByText('ExperienceBadge.threeYears')).toBeInTheDocument();
  });

  it('accepts a numeric metadata value', () => {
    render(<ExperienceBadge metadata={{ indoorExperienceYears: 2 }} />);
    expect(screen.getByText('ExperienceBadge.twoYears')).toBeInTheDocument();
  });

  it('renders nothing when metadata is missing', () => {
    render(<ExperienceBadge />);
    expect(screen.queryByTestId('experience-badge')).not.toBeInTheDocument();
  });

  it('renders nothing when the key is absent from metadata', () => {
    render(<ExperienceBadge metadata={{ somethingElse: true }} />);
    expect(screen.queryByTestId('experience-badge')).not.toBeInTheDocument();
  });

  it('renders nothing for a garbage value', () => {
    render(<ExperienceBadge metadata={{ indoorExperienceYears: 'pro-cyclist' }} />);
    expect(screen.queryByTestId('experience-badge')).not.toBeInTheDocument();
  });

  it('renders nothing for an out-of-range number', () => {
    render(<ExperienceBadge metadata={{ indoorExperienceYears: 42 }} />);
    expect(screen.queryByTestId('experience-badge')).not.toBeInTheDocument();
  });

  it('renders nothing for object-prototype key names', () => {
    render(<ExperienceBadge metadata={{ indoorExperienceYears: 'constructor' }} />);
    expect(screen.queryByTestId('experience-badge')).not.toBeInTheDocument();
  });
});
