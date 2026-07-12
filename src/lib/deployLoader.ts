interface DeployModule {
  DeployModal: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
}

export async function loadDeployModule(): Promise<DeployModule | null> {
  try {
    const modules = import.meta.glob('../deploy/index.ts');
    const keys = Object.keys(modules);
    if (keys.length > 0) {
      const mod = await modules[keys[0]]();
      return mod as DeployModule;
    }
    return null;
  } catch {
    return null;
  }
}
