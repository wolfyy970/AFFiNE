import { Logo1Icon } from '@blocksuite/icons/rc';
import clsx from 'clsx';
import type { FC } from 'react';

import { authHeaderWrapper } from './share.css';

export const AuthHeader: FC<{
  title: string;
  subTitle?: string;
  className?: string;
  /** When false, hides the AFFiNE triangle next to the title. */
  showLogo?: boolean;
}> = ({ title, subTitle, className, showLogo = true }) => {
  return (
    <div className={clsx(authHeaderWrapper, className)}>
      <p>
        {showLogo ? <Logo1Icon className="logo" /> : null}
        {title}
      </p>
      {/* Always render so title keeps first-of-type styles when subtitle is empty */}
      <p>{subTitle}</p>
    </div>
  );
};
