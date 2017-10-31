# linc-build-ssr

Everything related to building SSR applications

## Pre commit hook

In order to use the pre-commit hook to fix eslint issues, copy the file `pre-commit` into the directory `.git/hooks`. Make it executable by running `chmod +x pre-commit`, otherwise the hook won't be executed.

Run `yarn install` to install the necessary packages in `node_modules` of the top level directory of this repository. This ensures we can always find `eslint` and its related packages.

Please note that the pre-commit hook is executed even before a commit message is entered. If `eslint` returns and error, the commit process is halted. Otherwise, it will continue as per normal. Any files that are changed, e.g., as a result of `eslint --fix` will be re-added to the commit list.
