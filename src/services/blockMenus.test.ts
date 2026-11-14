import { afterEach, describe, expect, it } from 'vitest';
import { installMenuBlocking } from './blockMenus';

const fire = (target: Element, type: string) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event.defaultPrevented;
};

describe('blocage des menus', () => {
  let uninstall = () => {};
  afterEach(() => {
    uninstall();
    document.body.innerHTML = '';
  });

  it('bloque le clic droit, le glisser et la sélection sur les boutons et images', () => {
    uninstall = installMenuBlocking();
    document.body.innerHTML = '<button>Chat</button><img alt="" />';
    const button = document.querySelector('button')!;
    expect(fire(button, 'contextmenu')).toBe(true);
    expect(fire(document.querySelector('img')!, 'dragstart')).toBe(true);
    expect(fire(button, 'selectstart')).toBe(true);
  });

  it('laisse le menu dans les champs de saisie (coller un lien)', () => {
    uninstall = installMenuBlocking();
    document.body.innerHTML = '<input /><textarea></textarea>';
    expect(fire(document.querySelector('input')!, 'contextmenu')).toBe(false);
    expect(fire(document.querySelector('textarea')!, 'selectstart')).toBe(false);
  });
});
