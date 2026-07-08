// Config del CLI de Sanity. Se exporta un objeto plano (sin `defineCliConfig`)
// para evitar problemas de resolución del import en algunas versiones del CLI.
// projectId/dataset son públicos (no secretos).
export default {
  api: {
    projectId: '1uuj4tpg',
    dataset: 'production',
  },
};
