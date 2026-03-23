import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../environments/eniroment';

export const adminBypassInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const isAdminRoute = router.url.startsWith('/admin');
  const isApiRequest = req.url.startsWith(environment.apiUrl);

  if (isAdminRoute && isApiRequest) {
    req = req.clone({
      setHeaders: {
        'x-admin-bypass': 'true',
      },
    });
  }

  return next(req);
};
