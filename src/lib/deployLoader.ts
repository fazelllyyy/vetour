interface DeployModule {
  DeployModal: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
}

export async function loadDeployModule(): Promise<DeployModule | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — deploy module only available in private builds
    const mod = await import(/* @vite-ignore */ '../deploy/index');
    return mod as DeployModule;
  } catch {
    return null;
  }
}
