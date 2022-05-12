#!/usr/bin/env node
import { cac } from 'cac';
import chalk from 'chalk';
import { builder } from './builder';
import { version } from '../../../package.json';
const cli = cac('ccli');

cli
  .command('build [contract]')
  .option('--output <path>', `[string] output file`)
  .example((bin) => {
    return bin
  })
  .action(async (input: string, opt: {output?: string}) => {
    try {
      await builder(input, opt.output);
    } catch (e: any) {
      chalk.red(`error when build contract:\n${e.stack}`);
      process.exit(1);
    }
  });

cli.help();
cli.version(version);

cli.parse();
