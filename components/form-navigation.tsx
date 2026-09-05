import { formUrls } from '@/lib/form-sharing';

type FormNavigationProps = {
  adminEntry: boolean;
  formActive: boolean;
};

// Full navigations keep the ordinary form and authenticated admin form separate.
// A link never grants access: /admin still checks the server-side session.
export function FormNavigation({
  adminEntry,
  formActive,
}: FormNavigationProps) {
  return (
    <>
      <a
        className={formActive && !adminEntry ? 'nav-item active' : 'nav-item'}
        href={formUrls.listener}
        aria-current={formActive && !adminEntry ? 'page' : undefined}
      >
        <span className="nav-dot" aria-hidden="true" />
        TINGLOVCHI FORMASI
      </a>
      <a
        className={formActive && adminEntry ? 'nav-item active' : 'nav-item'}
        href={formUrls.admin}
        aria-current={formActive && adminEntry ? 'page' : undefined}
        title="Bosh admin hisobi bilan kirish"
      >
        <span className="nav-dot" aria-hidden="true" />
        BOSH ADMIN FORMASI
      </a>
    </>
  );
}
