import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PinPad } from './PinPad';

describe('PinPad', () => {
  it('n’active le bouton qu’à partir de 4 chiffres et n’affiche jamais le PIN', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null);
    render(<PinPad title="Espace parents" submitLabel="Ouvrir" onSubmit={onSubmit} />);
    const submit = screen.getByRole('button', { name: 'Ouvrir' });
    expect(submit).toBeDisabled();

    for (const digit of ['1', '2', '3']) fireEvent.click(screen.getByRole('button', { name: `Chiffre ${digit}` }));
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Chiffre 4' }));
    expect(submit).toBeEnabled();
    expect(screen.queryByText('1234')).not.toBeInTheDocument();

    fireEvent.click(submit);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('1234'));
  });

  it('affiche l’erreur renvoyée et vide la saisie', async () => {
    const onSubmit = vi.fn().mockResolvedValue('Code incorrect.');
    render(<PinPad title="Espace parents" submitLabel="Ouvrir" onSubmit={onSubmit} />);
    for (const digit of ['9', '9', '9', '9']) fireEvent.click(screen.getByRole('button', { name: `Chiffre ${digit}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Code incorrect.');
    expect(screen.getByRole('button', { name: 'Ouvrir' })).toBeDisabled();
  });

  it('efface le dernier chiffre', () => {
    const onSubmit = vi.fn().mockResolvedValue(null);
    render(<PinPad title="Espace parents" submitLabel="Ouvrir" onSubmit={onSubmit} />);
    for (const digit of ['1', '2', '3', '4', '5']) fireEvent.click(screen.getByRole('button', { name: `Chiffre ${digit}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Effacer le dernier chiffre' }));
    expect(screen.getByLabelText('4 chiffre(s) saisi(s)')).toBeInTheDocument();
  });
});
