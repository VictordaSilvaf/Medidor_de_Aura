export type AppAlertVariant = 'success' | 'warn' | 'error' | 'info';

export type AppAlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type AppAlertConfig = {
  variant: AppAlertVariant;
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
};

type Listener = (config: AppAlertConfig | null) => void;

let listener: Listener | null = null;

export function subscribeAppAlert(next: Listener): () => void {
  listener = next;
  return () => {
    if (listener === next) listener = null;
  };
}

function show(config: AppAlertConfig) {
  listener?.(config);
}

function hide() {
  listener?.(null);
}

function withDefaultOk(buttons?: AppAlertButton[]): AppAlertButton[] {
  if (buttons?.length) return buttons;
  return [{ text: 'OK', style: 'default' }];
}

/** API imperativa no estilo Alert.alert, com variantes visuais. */
export const appAlert = {
  hide,
  show,
  success(title: string, message?: string, buttons?: AppAlertButton[]) {
    show({ variant: 'success', title, message, buttons: withDefaultOk(buttons) });
  },
  warn(title: string, message?: string, buttons?: AppAlertButton[]) {
    show({ variant: 'warn', title, message, buttons: withDefaultOk(buttons) });
  },
  error(title: string, message?: string, buttons?: AppAlertButton[]) {
    show({ variant: 'error', title, message, buttons: withDefaultOk(buttons) });
  },
  info(title: string, message?: string, buttons?: AppAlertButton[]) {
    show({ variant: 'info', title, message, buttons: withDefaultOk(buttons) });
  },
  /** Compatível com `Alert.alert(title, message, buttons)`. */
  alert(
    title: string,
    message?: string,
    buttons?: AppAlertButton[],
    options?: { variant?: AppAlertVariant },
  ) {
    show({
      variant: options?.variant ?? 'info',
      title,
      message,
      buttons: withDefaultOk(buttons),
    });
  },
};
