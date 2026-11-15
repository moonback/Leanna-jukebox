import { useEffect, useState } from 'react';
import { Volume2, RotateCcw, Star } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { GameHeader } from '../components/games/GameHeader';
import { EmojiPicture } from '../components/ui/EmojiPicture';
import { speakFrench } from '../services/speech';
import { recordGameRound } from '../services/gameProgress';
import './mini-jeux.css';

type Activity = 'colors' | 'shapes' | 'puzzle' | 'size' | 'animals';
type Choice = { id: string; label: string; emoji: string; color?: string; size?: 'small' | 'large'; sound?: string };

const ACTIVITIES: { id: Activity; title: string; emoji: string; subtitle: string }[] = [
  { id: 'colors', title: 'Les couleurs', emoji: '🌈', subtitle: 'Trouve la bonne couleur' },
  { id: 'shapes', title: 'Les formes', emoji: '🔺', subtitle: 'Reconnais les formes' },
  { id: 'puzzle', title: 'Puzzle 4 pièces', emoji: '🧩', subtitle: 'Reconstitue la petite scène' },
  { id: 'size', title: 'Grand ou petit ?', emoji: '🐘', subtitle: 'Compare les tailles' },
  { id: 'animals', title: 'Les cris des animaux', emoji: '🐮', subtitle: 'Écoute et découvre' },
];

const COLORS: Choice[] = [
  { id: 'red', label: 'Rouge', emoji: '🔴', color: '#f16b70' },
  { id: 'blue', label: 'Bleu', emoji: '🔵', color: '#63a5ed' },
  { id: 'yellow', label: 'Jaune', emoji: '🟡', color: '#f4cf54' },
  { id: 'green', label: 'Vert', emoji: '🟢', color: '#69c58a' },
  { id: 'purple', label: 'Violet', emoji: '🟣', color: '#a78be8' },
  { id: 'orange', label: 'Orange', emoji: '🟠', color: '#f5a45e' },
];
const SHAPES: Choice[] = [
  { id: 'circle', label: 'Rond', emoji: '⚪' },
  { id: 'square', label: 'Carré', emoji: '🟥' },
  { id: 'triangle', label: 'Triangle', emoji: '🔺' },
  { id: 'star', label: 'Étoile', emoji: '⭐' },
  { id: 'heart', label: 'Cœur', emoji: '❤️' },
];
const ANIMALS: Choice[] = [
  { id: 'cat', label: 'Chat', emoji: '🐱', sound: 'Miaou, miaou !' },
  { id: 'dog', label: 'Chien', emoji: '🐶', sound: 'Ouaf, ouaf !' },
  { id: 'cow', label: 'Vache', emoji: '🐮', sound: 'Meuh !' },
  { id: 'sheep', label: 'Mouton', emoji: '🐑', sound: 'Bêêê !' },
  { id: 'duck', label: 'Canard', emoji: '🦆', sound: 'Coin, coin !' },
  { id: 'lion', label: 'Lion', emoji: '🦁', sound: 'Roaar !' },
];
const PUZZLE: Choice[] = [
  { id: 'cat', label: 'Le chat', emoji: '🐱' },
  { id: 'fish', label: 'Le poisson', emoji: '🐟' },
  { id: 'yarn', label: 'La pelote', emoji: '🧶' },
  { id: 'house', label: 'La maison', emoji: '🏠' },
];

function shuffle<T,>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}
function pick<T,>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}
function createChoices(activity: Activity): { target: Choice; choices: Choice[]; puzzle: Choice[] } {
  if (activity === 'colors') {
    const choices = shuffle(COLORS).slice(0, 3);
    return { target: pick(choices), choices, puzzle: [] };
  }
  if (activity === 'shapes') {
    const choices = shuffle(SHAPES).slice(0, 3);
    return { target: pick(choices), choices, puzzle: [] };
  }
  if (activity === 'size') {
    const animal = pick(ANIMALS);
    return {
      target: { ...animal, label: 'Grand' },
      choices: [
        { ...animal, id: 'small', label: 'Petit', size: 'small' },
        { ...animal, id: 'large', label: 'Grand', size: 'large' },
      ],
      puzzle: [],
    };
  }
  if (activity === 'animals') {
    const choices = shuffle(ANIMALS).slice(0, 3);
    return { target: pick(choices), choices, puzzle: [] };
  }
  return { target: PUZZLE[0]!, choices: [], puzzle: shuffle(PUZZLE) };
}

function promptFor(activity: Activity, target: Choice): string {
  if (activity === 'colors') return `Trouve le ${target.label.toLowerCase()} !`;
  if (activity === 'shapes') return `Où est le ${target.label.toLowerCase()} ?`;
  if (activity === 'size') return 'Montre-moi le grand animal !';
  if (activity === 'animals') return `Quel animal fait ${target.sound?.replace(' !', '')} ?`;
  return 'Replace les quatre images pour aider le chat !';
}

/** Cinq jeux tactiles très courts, sans chronomètre ni pénalité. */
export function MiniJeuxPage() {
  const [activity, setActivity] = useState<Activity>('colors');
  const [round, setRound] = useState(() => createChoices('colors'));
  const [answer, setAnswer] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Choice[]>([]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');
  const [completed, setCompleted] = useState(false);

  const prompt = promptFor(activity, round.target);

  useEffect(() => {
    speakFrench(prompt);
  }, [activity, round.target.id]); // La consigne est répétée à chaque nouvelle manche.

  const nextRound = () => {
    setRound(createChoices(activity));
    setAnswer(null);
    setPlaced([]);
    setMessage('');
    setCompleted(false);
  };

  const changeActivity = (next: Activity) => {
    setActivity(next);
    setRound(createChoices(next));
    setAnswer(null);
    setPlaced([]);
    setMessage('');
    setCompleted(false);
  };

  const win = (choice: Choice) => {
    setAnswer(choice.id);
    setCompleted(true);
    setScore((value) => value + 1);
    void recordGameRound(`mini-${activity}`).catch(() => undefined);
    if (activity === 'animals') {
      speakFrench(`Bravo ! Le ${choice.label.toLowerCase()} fait ${choice.sound}`);
    } else if (activity === 'size') {
      speakFrench('Oui ! Il est grand ! Bravo !');
    } else {
      speakFrench('Bravo ! Tu as trouvé !');
    }
    setMessage('Bravo ! ⭐');
  };

  const choose = (choice: Choice) => {
    if (completed) return;
    if (choice.id === round.target.id || (activity === 'size' && choice.id === 'large')) {
      win(choice);
      return;
    }
    setMessage('Presque ! On réessaie ensemble.');
    speakFrench('Presque ! On réessaie ensemble.');
  };

  const placePiece = (piece: Choice) => {
    if (completed || placed.some((item) => item.id === piece.id)) return;
    const expected = PUZZLE[placed.length];
    if (piece.id !== expected?.id) {
      setMessage('Regarde le modèle pour trouver la prochaine pièce.');
      speakFrench('Regarde le modèle pour trouver la prochaine pièce.');
      return;
    }
    const next = [...placed, piece];
    setPlaced(next);
    speakFrench(piece.label);
    if (next.length === 4) {
      setCompleted(true);
      setScore((value) => value + 1);
      void recordGameRound('mini-puzzle').catch(() => undefined);
      setMessage('Bravo ! Le puzzle est terminé ! ⭐');
      speakFrench('Bravo ! Le puzzle est terminé !');
    }
  };

  const repeatPrompt = () => speakFrench(prompt);

  return (
    <AppShell showNavigation={false}>
      <GameHeader title="Mes petits jeux" back="/jeux">
        <span className="mini-jeux-score" aria-label={`${score} réussites`}><Star size={18} fill="currentColor" /> {score}</span>
      </GameHeader>

      <nav className="mini-jeux-tabs" aria-label="Choisir un jeu">
        {ACTIVITIES.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`mini-jeux-tab${activity === item.id ? ' is-active' : ''}`}
            onClick={() => changeActivity(item.id)}
            aria-pressed={activity === item.id}
          >
            <span>{item.emoji}</span>
            <span>{item.title}</span>
          </button>
        ))}
      </nav>

      <section className="mini-jeux-stage" aria-label={ACTIVITIES.find((item) => item.id === activity)?.title}>
        <p className="mini-jeux-subtitle">{ACTIVITIES.find((item) => item.id === activity)?.subtitle}</p>
        <button type="button" className="mini-jeux-prompt" onClick={repeatPrompt}>
          <Volume2 size={24} aria-hidden="true" />
          <span>{prompt}</span>
        </button>

        {activity === 'puzzle' ? (
          <>
            <div className="mini-puzzle-model" aria-label="Modèle du puzzle">
              <span>Le modèle :</span>
              {PUZZLE.map((piece) => <span key={piece.id} aria-hidden="true">{piece.emoji}</span>)}
            </div>
            <div className="mini-puzzle-board" aria-label="Pièces placées">
              {Array.from({ length: 4 }, (_, index) => (
                <div className={`mini-puzzle-slot${placed[index] ? ' has-piece' : ''}`} key={index}>
                  {placed[index] ? <><span>{placed[index].emoji}</span><small>{index + 1}</small></> : <span className="mini-puzzle-empty">{index + 1}</span>}
                </div>
              ))}
            </div>
            <div className="mini-jeux-choices mini-jeux-choices--puzzle">
              {round.puzzle.map((piece) => (
                <button
                  type="button"
                  key={piece.id}
                  className={`mini-jeux-choice mini-puzzle-piece${placed.some((item) => item.id === piece.id) ? ' is-used' : ''}`}
                  onClick={() => placePiece(piece)}
                  disabled={completed || placed.some((item) => item.id === piece.id)}
                  aria-label={piece.label}
                >
                  <span>{piece.emoji}</span><small>{piece.label}</small>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className={`mini-jeux-choices${activity === 'size' ? ' mini-jeux-choices--size' : ''}`}>
            {round.choices.map((choice) => (
              <button
                type="button"
                key={choice.id}
                className={`mini-jeux-choice${answer === choice.id ? ' is-correct' : ''}${activity === 'size' ? ` mini-jeux-size--${choice.size}` : ''}`}
                onClick={() => choose(choice)}
                disabled={completed}
                aria-label={choice.label}
              >
                {activity === 'colors' ? (
                  <span className="mini-jeux-color" style={{ background: choice.color }} aria-hidden="true" />
                ) : activity === 'animals' ? (
                  <><span className="mini-jeux-emoji"><EmojiPicture emoji={choice.emoji} /></span><small>{choice.label}</small></>
                ) : activity === 'size' ? (
                  <><span className="mini-jeux-emoji"><EmojiPicture emoji={choice.emoji} /></span><small>{choice.label}</small></>
                ) : (
                  <><span className="mini-jeux-shape">{choice.emoji}</span><small>{choice.label}</small></>
                )}
              </button>
            ))}
          </div>
        )}

        {message && <p className={`mini-jeux-feedback${completed ? ' is-happy' : ''}`} aria-live="polite">{message}</p>}
        {completed && (
          <button type="button" className="mini-jeux-next" onClick={nextRound}>
            <RotateCcw size={20} /> Encore !
          </button>
        )}
      </section>
    </AppShell>
  );
}
