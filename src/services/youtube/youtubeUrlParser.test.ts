import { describe, expect, it } from 'vitest';
import { parseYouTubeUrl } from './youtubeUrlParser';

const ID = 'dQw4w9WgXcQ';

describe('parseYouTubeUrl — formats acceptés', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', ID],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s', ID],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', ID],
    ['https://youtu.be/dQw4w9WgXcQ', ID],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', ID],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', ID],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', ID],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', ID],
    ['  https://youtu.be/dQw4w9WgXcQ  ', ID],
    ['youtube.com/watch?v=dQw4w9WgXcQ', ID],
    ['http://youtu.be/dQw4w9WgXcQ', ID],
  ])('accepte %s', (input, expected) => {
    expect(parseYouTubeUrl(input)).toEqual({ ok: true, videoId: expected });
  });
});

describe('parseYouTubeUrl — refus', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['https://exemple.com/watch?v=dQw4w9WgXcQ', 'unsupported-domain'],
    ['https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ', 'unsupported-domain'],
    ['https://evilyoutube.com/watch?v=dQw4w9WgXcQ', 'unsupported-domain'],
    ['https://youtu.be.evil.com/dQw4w9WgXcQ', 'unsupported-domain'],
    ['javascript:alert(1)', 'invalid-url'],
    ['https://www.youtube.com/channel/UCxxxx', 'unsupported-format'],
    ['https://www.youtube.com/watch', 'unsupported-format'],
    ['https://www.youtube.com/watch?v=', 'unsupported-format'],
    ['https://youtu.be/', 'unsupported-format'],
    ['https://www.youtube.com/watch?v=court', 'invalid-id'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ!!', 'invalid-id'],
    ['https://www.youtube.com/watch?v=<script>', 'invalid-id'],
  ])('refuse %j (%s)', (input, reason) => {
    expect(parseYouTubeUrl(input)).toEqual({ ok: false, reason });
  });
});
