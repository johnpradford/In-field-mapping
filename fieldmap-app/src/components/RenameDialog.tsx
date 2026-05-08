import { useEffect, useRef, useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
} from '@ionic/react';

/**
 * Reusable rename modal using Ionic UI.
 */
export default function RenameDialog({
  open,
  title,
  initialName,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  placeholder,
  onSave,
  onCancel,
}: {
  open: boolean;
  title: string;
  initialName: string;
  saveLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initialName);
  const inputRef = useRef<HTMLIonInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(initialName);
      setTimeout(() => {
        inputRef.current?.setFocus();
      }, 0);
    }
  }, [open, initialName]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    onSave(trimmed);
  }

  return (
    <IonModal isOpen={open} backdropDismiss={false}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Name</IonLabel>
          <IonInput
            ref={inputRef}
            value={draft}
            onIonInput={(e) => setDraft(String(e.detail.value ?? ''))}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              else if (e.key === 'Escape') onCancel();
            }}
          />
        </IonItem>
      </IonContent>
      <IonFooter className="ion-padding">
        <div className="flex justify-end gap-2">
          <IonButton fill="clear" onClick={onCancel}>
            {cancelLabel}
          </IonButton>
          <IonButton onClick={commit} disabled={draft.trim().length === 0}>
            {saveLabel}
          </IonButton>
        </div>
      </IonFooter>
    </IonModal>
  );
}
