module.exports = (fn, cleanupFn = null) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(async (err) => {
      if (cleanupFn && typeof cleanupFn === 'function') {
        try {
          console.log('Executing cleanup function due to error:', err.message);
          await cleanupFn(req, err);
        } catch (cleanupErr) {
          console.error('Error during cleanup operation:', cleanupErr);
        }
      }
      next(err);
    });
  };
};
