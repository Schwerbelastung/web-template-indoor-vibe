import React from 'react';
import classNames from 'classnames';

import css from './IconCart.module.css';

/**
 * Shopping cart icon.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @returns {JSX.Element} SVG icon
 */
const IconCart = props => {
  const { rootClassName, className } = props;
  const classes = classNames(rootClassName || css.root, className);

  return (
    <svg
      className={classes}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 4h2.2l2.3 11.2a1.6 1.6 0 0 0 1.57 1.3h7.9a1.6 1.6 0 0 0 1.56-1.26L20.4 8H6.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.9" cy="20.2" r="1.5" fill="currentColor" />
      <circle cx="16.6" cy="20.2" r="1.5" fill="currentColor" />
    </svg>
  );
};

export default IconCart;
