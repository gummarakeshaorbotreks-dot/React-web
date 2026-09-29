import { createBrowserRouter } from 'react-router-dom';
import { routes } from './routes';
import { setPendingLocation } from './navigationTarget';

export const router = createBrowserRouter(routes);

router.subscribe((state) => setPendingLocation(state.navigation.location));

// Resolves once the current page's code has loaded, so the first render can
// show the real page straight away.
export function routerReady() {
  if (router.state.initialized) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = router.subscribe((state) => {
      if (state.initialized) {
        unsubscribe();
        resolve();
      }
    });
  });
}
