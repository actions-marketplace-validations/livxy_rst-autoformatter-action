import * as core from "@actions/core";
import { exec, ExecOptions } from "@actions/exec";
import * as fs from "fs";
import * as glob from "glob";

type ExecuteReturn = { err: boolean, stdOut: string, stdErr: string };

const execute = async (command: string, options: ExecOptions & { listeners?: any } = {}): Promise<ExecuteReturn> => {
	let stdOut = "";
	let stdErr = "";

	const execOptions: ExecOptions & { listeners?: any } = {
		...options,
		listeners: {
			stdout: (data: Buffer) => {
				stdOut += data.toString();
			},
			stderr: (data: Buffer) => {
				stdErr += data.toString();
			},
			...options.listeners,
		},
	};

	const exitCode = await exec(command, [], execOptions);
	return { err: exitCode !== 0, stdOut, stdErr };
};

const run = async () => {
	const filesPattern: string = core.getInput("files") || "**/*.rst";
	const commitString: string = core.getInput("commit") || "true";
	const commit: boolean = commitString.toLowerCase() !== "false";
	const githubUsername: string = core.getInput("github-username") || "github-actions";
	const commitMessage: string = core.getInput("commit-message") || "Apply rstfmt formatting";

	await execute("sudo apt-get update", { silent: true });
	await execute("sudo apt-get install -y python3.10 python3-pip", { silent: true });
	await execute("pip3 install rstfmt==0.0.13", { silent: true });

	const files: string[] = glob.sync(filesPattern);
	core.debug(`Files to format: ${files.join(", ")}`);

	for (const file of files) {
		const original: string = fs.readFileSync(file, "utf-8");
		await execute(`rstfmt "${file}" > "${file}"`, { silent: true });
		const formatted: string = fs.readFileSync(file, "utf-8");

		if (original !== formatted && commit) {
			await execute(`git add "${file}"`);
		}
	}

	if (commit) {
		await execute(`git config user.name "${githubUsername}"`, { silent: true });
		await execute("git config user.email ''", { silent: true });

		const { stdOut } = await execute("git status --porcelain", { silent: true });
		if (stdOut.trim() !== "") {
			await execute(`git commit --all -m "${commitMessage}"`);
			await execute("git push", { silent: true });
		} else {
			core.info("Nothing to commit!");
		}
	}
};

run().catch((error: Error) => core.setFailed(error.message));
