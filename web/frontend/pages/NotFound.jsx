import { Card, EmptyState, Page } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { notFoundImage } from "../assets";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Page>
      <Card padding="500">
        <EmptyState heading={t("NotFound.heading") || "Page Not Found"} image={notFoundImage}>
          <p>{t("NotFound.description") || "The page you are looking for does not exist."}</p>
        </EmptyState>
      </Card>
    </Page>
  );
}
