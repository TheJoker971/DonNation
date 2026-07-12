import { getDonorLevel } from './donor-level.util';

describe('getDonorLevel', () => {
  it('returns bronze below 100 points', () => {
    expect(getDonorLevel(0)).toBe('bronze');
    expect(getDonorLevel(99)).toBe('bronze');
  });

  it('returns silver from 100 points', () => {
    expect(getDonorLevel(100)).toBe('silver');
    expect(getDonorLevel(499)).toBe('silver');
  });

  it('returns gold from 500 points', () => {
    expect(getDonorLevel(500)).toBe('gold');
  });

  it('returns platinum from 1000 points', () => {
    expect(getDonorLevel(1000)).toBe('platinum');
  });
});
