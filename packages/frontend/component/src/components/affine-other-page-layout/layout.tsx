import { Button } from '@affine/component/ui/button';
import { useI18n } from '@affine/i18n';
import { Logo1Icon } from '@blocksuite/icons/rc';
import { useTheme } from 'next-themes';
import { type ReactNode, useCallback } from 'react';

import dotBgDark from './assets/dot-bg.dark.png';
import dotBgLight from './assets/dot-bg.light.png';
import { DesktopNavbar } from './desktop-navbar';
import * as styles from './index.css';
import { MobileNavbar } from './mobile-navbar';

export const AffineOtherPageLayout = ({
  children,
  hideMarketingNav = false,
  credit,
}: {
  children: ReactNode;
  /**
   * When true, omit the marketing header (nav links, download) and show only
   * an optional understated credit in the top-left.
   */
  hideMarketingNav?: boolean;
  /** Optional small credit text when `hideMarketingNav` is set. */
  credit?: string;
}) => {
  const t = useI18n();

  const openDownloadLink = useCallback(() => {
    open(BUILD_CONFIG.downloadUrl, '_blank');
  }, []);

  const { resolvedTheme } = useTheme();
  const backgroundImage =
    resolvedTheme === 'dark' && dotBgDark ? dotBgDark : dotBgLight;

  return (
    <div
      className={styles.root}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {BUILD_CONFIG.isElectron ? (
        <div className={styles.draggableHeader} />
      ) : hideMarketingNav ? (
        credit ? (
          <div className={styles.topNavMinimal}>
            <span className={styles.affineCredit}>{credit}</span>
          </div>
        ) : null
      ) : (
        <div className={styles.topNav}>
          <a href="/" rel="noreferrer" className={styles.affineLogo}>
            <Logo1Icon width={24} height={24} />
          </a>

          <DesktopNavbar />
          <Button
            onClick={openDownloadLink}
            className={styles.hideInSmallScreen}
          >
            {t['com.affine.auth.open.affine.download-app']()}
          </Button>
          <MobileNavbar />
        </div>
      )}

      {children}
    </div>
  );
};
