import {readdir} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
for(const dir of ['src','public','scripts','fixtures'])for(const name of await readdir(dir))if(name.endsWith('.js'))execFileSync(process.execPath,['--check',`${dir}/${name}`],{stdio:'inherit'});
console.log('JavaScript syntax checks passed. No TypeScript compiler is required for this JavaScript project.');
