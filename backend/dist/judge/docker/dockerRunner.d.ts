interface DockerRunOptions {
    image: string;
    workDir: string;
    command: string[];
    stdin?: string;
    timeoutMs: number;
    memoryLimit?: string;
    cpuLimit?: string;
}
interface DockerRunResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    executionTime: number;
}
export declare class DockerRunner {
    run(options: DockerRunOptions): Promise<DockerRunResult>;
}
export declare const dockerRunner: DockerRunner;
export {};
//# sourceMappingURL=dockerRunner.d.ts.map