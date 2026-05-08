import { useEffect, useRef } from 'react';
import { useIonAlert } from '@ionic/react';

/**
 * Reusable Yes/No confirmation alert using Ionic UI.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  dangerColour = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dangerColour?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [present, dismiss] = useIonAlert();
  const actionRef = useRef<'confirm' | 'cancel' | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    actionRef.current = null;
    present({
      header: title,
      message: message || undefined,
      buttons: [
        {
          text: cancelLabel,
          role: 'cancel',
          handler: () => {
            actionRef.current = 'cancel';
          },
        },
        {
          text: confirmLabel,
          handler: () => {
            actionRef.current = 'confirm';
          },
          cssClass: dangerColour ? 'ion-color-danger' : 'ion-color-primary',
        },
      ],
      onDidDismiss: () => {
        if (actionRef.current === 'confirm') {
          onConfirm();
        } else {
          onCancel();
        }
      },
    });

    return () => {
      dismiss();
    };
  }, [open, title, message, cancelLabel, confirmLabel, dangerColour, onConfirm, onCancel, present, dismiss]);

  return null;
}
