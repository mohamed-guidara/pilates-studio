import { SessionLevelPipe } from './session-level-pipe';

describe('SessionLevelPipe', () => {
  it('create an instance', () => {
    const pipe = new SessionLevelPipe();
    expect(pipe).toBeTruthy();
  });
});
