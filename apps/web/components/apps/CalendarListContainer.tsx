"use client";

import { useEffect, Suspense } from "react";

import { InstallAppButton } from "@calcom/app-store/components";
import { DestinationCalendarSettingsWebWrapper } from "@calcom/atoms/destination-calendar/wrappers/DestinationCalendarSettingsWebWrapper";
import { SelectedCalendarsSettingsWebWrapper } from "@calcom/atoms/selected-calendars/wrappers/SelectedCalendarsSettingsWebWrapper";
import AppListCard from "@calcom/features/apps/components/AppListCard";
import { SkeletonLoader } from "@calcom/features/apps/components/SkeletonLoader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { ShellSubHeading } from "@calcom/ui/components/layout";
import { List } from "@calcom/ui/components/list";
import { showToast } from "@calcom/ui/components/toast";

import { QueryCell } from "@lib/QueryCell";
import useRouterQuery from "@lib/hooks/useRouterQuery";

import SubHeadingTitleWithConnections from "@components/integrations/SubHeadingTitleWithConnections";

type Props = {
  onChanged: () => unknown | Promise<unknown>;
  fromOnboarding?: boolean;
  destinationCalendarId?: string;
  isPending?: boolean;
};

function CalendarList(props: Props) {
  const { t } = useLocale();
  const query = trpc.viewer.apps.integrations.useQuery({ variant: "calendar", onlyInstalled: false });

  return (
    <QueryCell
      query={query}
      success={({ data }) => (
        <List>
          {data.items.map((item) => (
            <AppListCard
              title={item.name}
              key={item.name}
              logo={item.logo}
              description={item.description}
              shouldHighlight
              slug={item.slug}
              actions={
                <InstallAppButton
                  type={item.type}
                  render={(buttonProps) => (
                    <Button color="secondary" {...buttonProps}>
                      {t("connect")}
                    </Button>
                  )}
                  onChanged={() => props.onChanged()}
                />
              }
            />
          ))}
        </List>
      )}
    />
  );
}

export function CalendarListContainer(props: { heading?: boolean; fromOnboarding?: boolean }) {
  const { t } = useLocale();
  const { heading = true, fromOnboarding } = props;
  const { error, setQuery: setError } = useRouterQuery("error");

  useEffect(() => {
    if (error === "account_already_linked") {
      showToast(t(error), "error", { id: error });
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const utils = trpc.useUtils();
  const onChanged = () =>
    Promise.allSettled([
      utils.viewer.apps.integrations.invalidate(
        { variant: "calendar", onlyInstalled: true },
        {
          exact: true,
        }
      ),
      utils.viewer.calendars.connectedCalendars.invalidate(),
    ]);
  const query = trpc.viewer.calendars.connectedCalendars.useQuery();
  const installedCalendars = trpc.viewer.apps.integrations.useQuery({
    variant: "calendar",
    onlyInstalled: true,
  });
  const mutation = trpc.viewer.calendars.setDestinationCalendar.useMutation({
    onSuccess: () => {
      utils.viewer.calendars.connectedCalendars.invalidate();
    },
  });
  return (
    <QueryCell
      query={query}
      customLoader={<SkeletonLoader />}
      success={({ data }) => {
        return (
          <>
            {!!data.connectedCalendars.length || !!installedCalendars.data?.items.length ? (
              <>
                {heading && (
                  <>
                    <DestinationCalendarSettingsWebWrapper />
                    <Suspense fallback={<SkeletonLoader />}>
                      <SelectedCalendarsSettingsWebWrapper
                        onChanged={onChanged}
                        fromOnboarding={fromOnboarding}
                        destinationCalendarId={data.destinationCalendar?.externalId}
                        isPending={mutation.isPending}
                      />
                    </Suspense>
                  </>
                )}
              </>
            ) : fromOnboarding ? (
              <>
                {!!query.data?.connectedCalendars.length && (
                  <ShellSubHeading
                    className="mt-4"
                    title={<SubHeadingTitleWithConnections title={t("connect_additional_calendar")} />}
                  />
                )}
                <CalendarList onChanged={onChanged} />
              </>
            ) : (
              <EmptyScreen
                Icon="calendar"
                headline={t("no_category_apps", {
                  category: t("calendar").toLowerCase(),
                })}
                description={t(`no_category_apps_description_calendar`)}
                buttonRaw={
                  <Button
                    color="secondary"
                    data-testid="connect-calendar-apps"
                    href="/apps/categories/calendar">
                    {t(`connect_calendar_apps`)}
                  </Button>
                }
              />
            )}
          </>
        );
      }}
    />
  );
}
