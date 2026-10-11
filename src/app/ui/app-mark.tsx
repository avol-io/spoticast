import { IS_BETA, LOGO_URL } from '../../lib/build-info';
import BetaBadge from './beta-badge';

/** Logo (and Beta badge) before page titles on mobile; the sidebar has it from lg. */
export function AppMark() {
  return (
    <span className="flex shrink-0 items-center gap-2 lg:hidden">
      <img src={LOGO_URL} alt="" className="size-7" />
      {IS_BETA && <BetaBadge />}
    </span>
  );
}

export default AppMark;
