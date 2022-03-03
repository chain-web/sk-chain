export class Cache {
  constructor(path: string) {
    this.path = path;
  }
  path: string;

  put = (key: string, value: string) => {
    localStorage.setItem(`${this.path}-_-${key}`, value);
  };
  get = (key: string): string => {
    return localStorage.getItem(`${this.path}-_-${key}`) as string;
  };
}
