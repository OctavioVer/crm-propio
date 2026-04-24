
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  name: 'name',
  plan: 'plan',
  brandingJson: 'brandingJson',
  settingsJson: 'settingsJson',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TenantDomainScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  domain: 'domain',
  isPrimary: 'isPrimary'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  email: 'email',
  name: 'name',
  passwordHash: 'passwordHash',
  avatarUrl: 'avatarUrl',
  role: 'role',
  permissionsJson: 'permissionsJson',
  settingsJson: 'settingsJson',
  emailVerified: 'emailVerified',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  refreshToken: 'refreshToken',
  userAgent: 'userAgent',
  ip: 'ip',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.MagicLinkScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  token: 'token',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  createdAt: 'createdAt'
};

exports.Prisma.TeamScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  managerId: 'managerId'
};

exports.Prisma.TeamMemberScalarFieldEnum = {
  teamId: 'teamId',
  userId: 'userId'
};

exports.Prisma.ContactScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  type: 'type',
  firstName: 'firstName',
  lastName: 'lastName',
  companyName: 'companyName',
  ownerId: 'ownerId',
  stage: 'stage',
  score: 'score',
  tags: 'tags',
  notes: 'notes',
  source: 'source',
  utmSource: 'utmSource',
  utmMedium: 'utmMedium',
  utmCampaign: 'utmCampaign',
  customFieldsJson: 'customFieldsJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContactEmailScalarFieldEnum = {
  id: 'id',
  contactId: 'contactId',
  email: 'email',
  isPrimary: 'isPrimary'
};

exports.Prisma.ContactPhoneScalarFieldEnum = {
  id: 'id',
  contactId: 'contactId',
  phone: 'phone',
  type: 'type'
};

exports.Prisma.CompanyScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  domain: 'domain',
  industry: 'industry',
  size: 'size',
  ownerId: 'ownerId'
};

exports.Prisma.CompanyContactScalarFieldEnum = {
  companyId: 'companyId',
  contactId: 'contactId',
  role: 'role'
};

exports.Prisma.PipelineScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  stagesJson: 'stagesJson',
  isDefault: 'isDefault',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DealScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  pipelineId: 'pipelineId',
  contactId: 'contactId',
  ownerId: 'ownerId',
  title: 'title',
  stage: 'stage',
  status: 'status',
  amount: 'amount',
  currency: 'currency',
  probability: 'probability',
  closeDate: 'closeDate',
  notes: 'notes',
  customFieldsJson: 'customFieldsJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  sku: 'sku',
  description: 'description',
  price: 'price',
  currency: 'currency',
  category: 'category',
  active: 'active'
};

exports.Prisma.DealProductScalarFieldEnum = {
  dealId: 'dealId',
  productId: 'productId',
  qty: 'qty',
  unitPrice: 'unitPrice',
  discount: 'discount'
};

exports.Prisma.ActivityScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  type: 'type',
  contactId: 'contactId',
  dealId: 'dealId',
  userId: 'userId',
  title: 'title',
  body: 'body',
  outcome: 'outcome',
  scheduledAt: 'scheduledAt',
  completedAt: 'completedAt',
  dueAt: 'dueAt',
  metadataJson: 'metadataJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConversationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  channel: 'channel',
  contactId: 'contactId',
  assignedTo: 'assignedTo',
  status: 'status',
  lastMessageAt: 'lastMessageAt',
  metadataJson: 'metadataJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  direction: 'direction',
  body: 'body',
  mediaUrls: 'mediaUrls',
  sentAt: 'sentAt',
  readAt: 'readAt',
  metadataJson: 'metadataJson'
};

exports.Prisma.WorkflowScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  description: 'description',
  triggerJson: 'triggerJson',
  nodesJson: 'nodesJson',
  active: 'active',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkflowExecutionScalarFieldEnum = {
  id: 'id',
  workflowId: 'workflowId',
  entityType: 'entityType',
  entityId: 'entityId',
  status: 'status',
  logJson: 'logJson',
  startedAt: 'startedAt',
  finishedAt: 'finishedAt'
};

exports.Prisma.AiDecisionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  model: 'model',
  actionType: 'actionType',
  inputJson: 'inputJson',
  outputJson: 'outputJson',
  confidence: 'confidence',
  humanApproved: 'humanApproved',
  approvedBy: 'approvedBy',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  beforeJson: 'beforeJson',
  afterJson: 'afterJson',
  ip: 'ip',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.FeatureFlagScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  flagKey: 'flagKey',
  enabled: 'enabled',
  configJson: 'configJson'
};

exports.Prisma.CustomFieldScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  entityType: 'entityType',
  fieldKey: 'fieldKey',
  fieldType: 'fieldType',
  label: 'label',
  required: 'required',
  requiredAtStage: 'requiredAtStage',
  optionsJson: 'optionsJson'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  title: 'title',
  body: 'body',
  type: 'type',
  entityType: 'entityType',
  entityId: 'entityId',
  readAt: 'readAt',
  createdAt: 'createdAt'
};

exports.Prisma.WebhookScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  url: 'url',
  events: 'events',
  secret: 'secret',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WebhookDeliveryScalarFieldEnum = {
  id: 'id',
  webhookId: 'webhookId',
  event: 'event',
  payload: 'payload',
  statusCode: 'statusCode',
  response: 'response',
  success: 'success',
  createdAt: 'createdAt'
};

exports.Prisma.FormScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  slug: 'slug',
  description: 'description',
  fieldsJson: 'fieldsJson',
  active: 'active',
  notifyEmail: 'notifyEmail',
  redirectUrl: 'redirectUrl',
  submitMessage: 'submitMessage',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FormSubmissionScalarFieldEnum = {
  id: 'id',
  formId: 'formId',
  contactId: 'contactId',
  dataJson: 'dataJson',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.SegmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  description: 'description',
  filterJson: 'filterJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ScheduledReportScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  type: 'type',
  cronExpr: 'cronExpr',
  recipients: 'recipients',
  active: 'active',
  lastSentAt: 'lastSentAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.Plan = exports.$Enums.Plan = {
  STARTER: 'STARTER',
  GROWTH: 'GROWTH',
  ENTERPRISE: 'ENTERPRISE'
};

exports.UserRole = exports.$Enums.UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SELLER: 'SELLER',
  VIEWER: 'VIEWER'
};

exports.ContactType = exports.$Enums.ContactType = {
  PERSON: 'PERSON',
  COMPANY: 'COMPANY'
};

exports.DealStatus = exports.$Enums.DealStatus = {
  OPEN: 'OPEN',
  WON: 'WON',
  LOST: 'LOST'
};

exports.ActivityType = exports.$Enums.ActivityType = {
  CALL: 'CALL',
  EMAIL: 'EMAIL',
  MEETING: 'MEETING',
  NOTE: 'NOTE',
  TASK: 'TASK',
  WHATSAPP: 'WHATSAPP'
};

exports.Channel = exports.$Enums.Channel = {
  EMAIL: 'EMAIL',
  WHATSAPP: 'WHATSAPP',
  SMS: 'SMS',
  CHAT: 'CHAT',
  INSTAGRAM: 'INSTAGRAM',
  FACEBOOK: 'FACEBOOK'
};

exports.ConversationStatus = exports.$Enums.ConversationStatus = {
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  RESOLVED: 'RESOLVED',
  ARCHIVED: 'ARCHIVED'
};

exports.MessageDirection = exports.$Enums.MessageDirection = {
  IN: 'IN',
  OUT: 'OUT'
};

exports.ExecutionStatus = exports.$Enums.ExecutionStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

exports.Prisma.ModelName = {
  Tenant: 'Tenant',
  TenantDomain: 'TenantDomain',
  User: 'User',
  Session: 'Session',
  MagicLink: 'MagicLink',
  Team: 'Team',
  TeamMember: 'TeamMember',
  Contact: 'Contact',
  ContactEmail: 'ContactEmail',
  ContactPhone: 'ContactPhone',
  Company: 'Company',
  CompanyContact: 'CompanyContact',
  Pipeline: 'Pipeline',
  Deal: 'Deal',
  Product: 'Product',
  DealProduct: 'DealProduct',
  Activity: 'Activity',
  Conversation: 'Conversation',
  Message: 'Message',
  Workflow: 'Workflow',
  WorkflowExecution: 'WorkflowExecution',
  AiDecision: 'AiDecision',
  AuditLog: 'AuditLog',
  FeatureFlag: 'FeatureFlag',
  CustomField: 'CustomField',
  Notification: 'Notification',
  Webhook: 'Webhook',
  WebhookDelivery: 'WebhookDelivery',
  Form: 'Form',
  FormSubmission: 'FormSubmission',
  Segment: 'Segment',
  ScheduledReport: 'ScheduledReport'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
