interface DeployModule {
  DeployModal: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
}

export async function loadDeployModule(): Promise<DeployModule | null> {
  try {
    const modulePath = '../deploy/index';
    const mod = await import(/* @vite-ignore */ modulePath);
    return mod as DeployModule;
  } catch {
    return null;
  }
}
