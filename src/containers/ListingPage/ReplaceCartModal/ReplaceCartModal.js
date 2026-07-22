import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';

import { Button, H4, Modal, SecondaryButton } from '../../../components';

import css from './ReplaceCartModal.module.css';

/**
 * Confirmation dialog shown when the user adds a listing to a cart that
 * already holds items from another seller (the cart is single-vendor).
 *
 * @component
 * @param {Object} props
 * @param {string} props.id - Modal id
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Called when the modal is dismissed
 * @param {Function} props.onConfirm - Called when the user confirms replacing the cart
 * @param {string} [props.currentAuthorName] - Display name of the seller whose items are in the cart
 * @param {Function} props.onManageDisableScrolling - Scrolling handler for Modal
 * @returns {JSX.Element}
 */
const ReplaceCartModal = props => {
  const { id, isOpen, onClose, onConfirm, currentAuthorName, onManageDisableScrolling } = props;

  return (
    <Modal
      id={id}
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal
    >
      <H4 as="h2" className={css.heading}>
        <FormattedMessage id="ListingPage.replaceCartTitle" />
      </H4>
      <p className={css.message}>
        <FormattedMessage
          id="ListingPage.replaceCartMessage"
          values={{ authorName: currentAuthorName }}
        />
      </p>
      <div className={css.buttons}>
        <SecondaryButton className={css.button} onClick={onClose}>
          <FormattedMessage id="ListingPage.replaceCartCancel" />
        </SecondaryButton>
        <Button className={css.button} onClick={onConfirm}>
          <FormattedMessage id="ListingPage.replaceCartConfirm" />
        </Button>
      </div>
    </Modal>
  );
};

export default ReplaceCartModal;
