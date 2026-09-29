import { HomePage } from '../pages/HomePage';
import { TrekDetailsPage } from '../pages/TrekDetailsPage';

export function createPages(page) {
  return {
    homePage: new HomePage(page),
    trekPage: new TrekDetailsPage(page)
  };
}