import encodeOpaqueId from "@reactioncommerce/api-utils/encodeOpaqueId.js";
import importAsString from "@reactioncommerce/api-utils/importAsString.js";
import Factory from "/tests/util/factory.js";
import TestApp from "/tests/util/TestApp.js";

const UpdateFlatRateFulfillmentMethodMutation = importAsString("./UpdateFlatRateFulfillmentMethodMutation.graphql");

jest.setTimeout(300000);

const internalShopId = "123";
const opaqueShopId = "cmVhY3Rpb24vc2hvcDoxMjM="; // reaction/shop:123
const shopName = "Test Shop";

const groups = ["Standard", "Priority", "Next-Day"];
const mockFulfillmentMethodId = "mockMethod";
const opaqueMockFulfillmentMethodId = encodeOpaqueId("reaction/fulfillmentMethod", mockFulfillmentMethodId);

const mockFulfillmentMethod = Factory.FulfillmentMethod.makeOne({
  _id: mockFulfillmentMethodId,
  shopId: internalShopId,
  name: "mockMethod",
  label: `${groups[0]} mockMethod`,
  handling: 9.5,
  rate: 90,
  cost: 9,
  isEnabled: true,
  fulfillmentTypes: ["shipping"],
  group: groups[0]
});

const mockFulfillmentMethodInput = {
  name: "mockMethod2",
  label: `${groups[1]} mockMethod`,
  handling: 19.5,
  rate: 80,
  cost: 8,
  isEnabled: false,
  fulfillmentTypes: ["shipping"],
  group: groups[1]
};

const adminGroup = Factory.Group.makeOne({
  _id: "adminGroup",
  createdBy: null,
  name: "admin",
  permissions: ["reaction:legacy:shippingMethods/update"],
  slug: "admin",
  shopId: internalShopId
});

const customerGroup = Factory.Group.makeOne({
  _id: "customerGroup",
  createdBy: null,
  name: "customer",
  permissions: ["customer"],
  slug: "customer",
  shopId: internalShopId
});

const mockCustomerAccount = Factory.Account.makeOne({
  groups: [customerGroup._id],
  shopId: internalShopId
});

const mockAdminAccount = Factory.Account.makeOne({
  groups: [adminGroup._id],
  shopId: internalShopId
});

let testApp;
let updateFlatRateFulfillmentMethod;

beforeAll(async () => {
  testApp = new TestApp();
  await testApp.start();
  updateFlatRateFulfillmentMethod = testApp.mutate(UpdateFlatRateFulfillmentMethodMutation);
  await testApp.insertPrimaryShop({ _id: internalShopId, name: shopName });

  await testApp.collections.Groups.insertOne(adminGroup);
  await testApp.collections.Groups.insertOne(customerGroup);

  await testApp.collections.Shipping.insertOne({
    methods: [mockFulfillmentMethod],
    shopId: internalShopId
  });
});

// There is no need to delete any test data from collections because
// testApp.stop() will drop the entire test database. Each integration
// test file gets its own test database.
afterAll(() => testApp.stop());

afterEach(async () => {
  await testApp.clearLoggedInUser();
});

test("user can not update flat rate fulfillment method if admin is not logged in", async () => {
  await testApp.setLoggedInUser(mockCustomerAccount);

  try {
    await updateFlatRateFulfillmentMethod({
      input: {
        methodId: opaqueMockFulfillmentMethodId,
        shopId: opaqueShopId,
        method: mockFulfillmentMethodInput
      }
    });
  } catch (errors) {
    expect(errors[0]).toMatchSnapshot();
  }
});

test("user can update flat rate fulfillment method if admin is logged in", async () => {
  await testApp.setLoggedInUser(mockAdminAccount);

  let result;

  try {
    result = await updateFlatRateFulfillmentMethod({
      input: {
        methodId: opaqueMockFulfillmentMethodId,
        shopId: opaqueShopId,
        method: mockFulfillmentMethodInput
      }
    });
  } catch (error) {
    expect(error).toBeUndefined();
    return;
  }

  expect(result.updateFlatRateFulfillmentMethod.method).toEqual({
    ...mockFulfillmentMethodInput,
    _id: opaqueMockFulfillmentMethodId
  });
});


