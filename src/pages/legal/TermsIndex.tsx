import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import {
  ACADEMY_TERMS_INDEX_PATH,
  ACADEMY_TERMS_PATH,
  ACADEMY_TERMS_TITLE,
} from "@/lib/academyLegal";
import { CLOUD_DPA_PATH, CLOUD_DPA_TITLE, CLOUD_SUBPROCESSORS_PATH, CLOUD_SUBPROCESSORS_TITLE } from "@/lib/cloudDpa";
import { CLOUD_TERMS_PATH, CLOUD_TERMS_TITLE } from "@/lib/cloudLegal";

export default function TermsIndex() {
  return (
    <Layout>
      <Seo
        title="Terms | Elsa Workflows"
        description="Terms of sale for Elsa+ products sold on www.elsaworkflows.io."
        path={ACADEMY_TERMS_INDEX_PATH}
      />
      <div className="container max-w-3xl py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Terms</h1>
        <p className="text-muted-foreground mb-10">
          Each Elsa+ product has its own terms of sale.
        </p>
        <ul className="space-y-6">
          <li>
            <h2 className="text-xl font-semibold mb-1">
              <Link to={ACADEMY_TERMS_PATH} className="text-primary hover:underline">
                Elsa Academy
              </Link>
            </h2>
            <p className="text-sm text-muted-foreground">{ACADEMY_TERMS_TITLE}.</p>
          </li>
          <li>
            <h2 className="text-xl font-semibold mb-1">
              <Link to={CLOUD_TERMS_PATH} className="text-primary hover:underline">
                Elsa Cloud
              </Link>
            </h2>
            <p className="text-sm text-muted-foreground">{CLOUD_TERMS_TITLE}.</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <Link to={CLOUD_DPA_PATH} className="text-primary hover:underline">
                  {CLOUD_DPA_TITLE}
                </Link>
              </li>
              <li>
                <Link to={CLOUD_SUBPROCESSORS_PATH} className="text-primary hover:underline">
                  {CLOUD_SUBPROCESSORS_TITLE}
                </Link>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </Layout>
  );
}
