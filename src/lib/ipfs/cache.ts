import { readFileSync, writeFileSync, existsSync } from 'fs';

export class Cache {
  constructor(path: string) {
    this.path = path;
    if (!existsSync(path)) {
      writeFileSync(
        path,
        JSON.stringify({
          version: 1,
        }),
      );
    }
  }
  path: string;
  data: { [key: string]: string } = {};
  private loadFile = () => {
    this.data = JSON.parse(readFileSync(this.path).toString());
  };
  private saveFile = () => {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2));
  };
  put = (key: string, value: string) => {
    this.loadFile();
    this.data = { ...this.data, [key]: value };
    this.saveFile();
  };
  get = (key: string): string => {
    this.loadFile();
    return this.data[key];
  };
}
