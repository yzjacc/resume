// Serializes changes during PDF generation and runs once more for the latest edits.
export function createBuildQueue(run, onError = console.error) {
  let running = false;
  let pending = false;
  return async function enqueue() {
    pending = true;
    if (running) return;
    running = true;
    try {
      while (pending) {
        pending = false;
        try {
          await run();
        } catch (error) {
          onError(error);
        }
      }
    } finally {
      running = false;
    }
  };
}
