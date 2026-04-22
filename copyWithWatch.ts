import type { CopyOptions } from 'rollup-plugin-copy';
import { glob } from 'glob';
import copy from 'rollup-plugin-copy';

export default function copyWithWatch(options?: CopyOptions | undefined): ReturnType<typeof copy> {
  return {
    ...copy(options),
    async buildStart() {
      if (options?.targets) {
        // register each source file as a watched file
        for (const target of options.targets) {
          const files = await glob(target.src as string | string[], {
            posix: true,
            dotRelative: true,
            absolute: true, // required for changes to trigger rebuild
          });

          for (const file of files) {
            this.addWatchFile(file);
          }
        }
      }
    },
  };
}
