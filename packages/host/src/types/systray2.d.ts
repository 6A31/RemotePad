declare module "systray2" {
  interface SysTrayItem {
    title: string;
    tooltip: string;
    checked: boolean;
    enabled: boolean;
    click?: () => void;
    items?: SysTrayItem[];
  }

  interface SysTrayMenu {
    icon: string;
    title: string;
    tooltip: string;
    items: (SysTrayItem | unknown)[];
  }

  interface SysTrayOptions {
    menu: SysTrayMenu;
    debug?: boolean;
    copyDir?: boolean;
  }

  interface SysTrayClickAction {
    seq_id: number;
    item: SysTrayItem;
  }

  interface SysTrayUpdateAction {
    type: "update-item";
    item: SysTrayItem;
  }

  export default class SysTray {
    static separator: unknown;
    constructor(options: SysTrayOptions);
    onClick(callback: (action: SysTrayClickAction) => void): void;
    sendAction(action: SysTrayUpdateAction): void;
    kill(remove: boolean): void;
  }
}
