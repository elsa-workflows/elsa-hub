import { describe, expect, it } from "vitest";
import {
  ACADEMY_KIND,
  buildCloudCheckoutMetadata,
  canStartOrgCloudCheckout,
  classifyStripeDataObject,
  classifyStripeEvent,
  cloudCheckoutCancelPath,
  cloudCheckoutSuccessPath,
  cloudPortalReturnPath,
  CONTROL_ORGANIZATION_METADATA_KEY,
  HUB_ORGANIZATION_METADATA_KEY,
  HUB_USER_METADATA_KEY,
  isCloudCheckoutRequest,
  resolveControlOrganizationId,
  shouldRecordHubOrder,
} from "./billingContract";

describe("Cloud billing contract", () => {
  it("recognizes a Cloud checkout body and rejects Hub bundle checkout", () => {
    expect(isCloudCheckoutRequest({ productType: "cloud", organizationId: "org-1" })).toBe(true);
    expect(isCloudCheckoutRequest({ kind: "cloud" })).toBe(true);
    expect(isCloudCheckoutRequest({ bundleId: "b1", organizationId: "org-1" })).toBe(false);
    expect(isCloudCheckoutRequest({ productType: "academy" })).toBe(false);
  });

  it("puts Hub user/org and Control org on session metadata", () => {
    const metadata = buildCloudCheckoutMetadata({
      hubUserId: "user-1",
      hubOrganizationId: "hub-org-1",
      controlOrganizationId: "control-org-1",
    });
    expect(metadata.kind).toBe("cloud");
    expect(metadata.product_type).toBe("cloud");
    expect(metadata[HUB_USER_METADATA_KEY]).toBe("user-1");
    expect(metadata[HUB_ORGANIZATION_METADATA_KEY]).toBe("hub-org-1");
    expect(metadata[CONTROL_ORGANIZATION_METADATA_KEY]).toBe("control-org-1");
  });

  it("uses the Hub org as the Control org until elsa-control#825 linking lands", () => {
    expect(
      resolveControlOrganizationId({
        hubOrganizationId: "hub-org-1",
      }),
    ).toBe("hub-org-1");
    expect(
      resolveControlOrganizationId({
        controlOrganizationId: "control-org-1",
        hubOrganizationId: "hub-org-1",
      }),
    ).toBe("control-org-1");
  });

  it("does not record Hub orders or credits for Cloud subscription events", () => {
    expect(
      shouldRecordHubOrder({
        type: "checkout.session.completed",
        data: { object: { metadata: { kind: "cloud" } } },
      }),
    ).toBe(false);
    expect(
      shouldRecordHubOrder({
        type: "invoice.paid",
        data: { object: { metadata: { billing_type: "recurring", order_id: "ord-1" } } },
      }),
    ).toBe(true);
  });

  it("routes Cloud subscription events away from Hub orders and Academy away from Cloud", () => {
    expect(
      classifyStripeEvent({
        type: "checkout.session.completed",
        data: { object: { metadata: { kind: "cloud", product_type: "cloud" } } },
      }),
    ).toBe("cloud");
    expect(
      classifyStripeEvent({
        type: "customer.subscription.updated",
        data: { object: { metadata: { kind: "cloud" } } },
      }),
    ).toBe("cloud");
    expect(
      classifyStripeEvent({
        type: "invoice.paid",
        data: {
          object: {
            parent: { subscription_details: { metadata: { kind: "cloud" } } },
          },
        },
      }),
    ).toBe("cloud");
    expect(
      classifyStripeDataObject({ metadata: { kind: ACADEMY_KIND } }),
    ).toBe("academy");
    expect(
      classifyStripeDataObject({ metadata: { billing_type: "recurring", bundle_id: "b1" } }),
    ).toBe("hub");
  });

  it("blocks non-admins from org Cloud checkout and keeps signed-in returns off public pricing", () => {
    expect(canStartOrgCloudCheckout(false)).toBe(false);
    expect(canStartOrgCloudCheckout(true)).toBe(true);
    expect(cloudCheckoutSuccessPath()).toBe("/cloud?payment=success");
    expect(cloudCheckoutCancelPath()).toBe("/cloud/billing?payment=cancelled");
    expect(cloudPortalReturnPath()).toBe("/cloud/billing");
    expect(cloudPortalReturnPath()).not.toMatch(/pricing|elsa-plus\/cloud-services/);
    expect(cloudCheckoutCancelPath()).not.toMatch(/pricing|elsa-plus\/cloud-services/);
  });
});
