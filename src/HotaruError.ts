export class HotaruError extends Error {
  public code: number;

  constructor(code: number, details?: string) {
    let message = HotaruError.codeToMessage[code];

    if (details) {
      message = `${message} (${details})`;
    }

    super(message);

    this.code = code;
  }

  // Server errors
  static USER_ALREADY_EXISTS = 500;
  static INVALID_EMAIL_ADDRESS = 501;
  static INVALID_PASSWORD = 502;
  static SESSION_NOT_FOUND = 503;
  static CAN_NOT_CONVERT_NON_GUEST_USER = 504;
  static CAN_NOT_SAVE_TWO_OBJECTS_WITH_SAME_ID = 505;
  static NO_USER_WITH_GIVEN_EMAIL_ADDRESS = 506;
  static INCORRECT_PASSWORD = 507;
  static LOGOUT_FAILED = 508;
  static INVALID_CLASS_NAME = 509;
  static UNKNOWN_SAVING_MODE = 510;
  static OBJECT_WITHOUT_ID_IN_UPDATE_ONLY_SAVING_MODE = 511;
  static CAN_NOT_OVERWRITE_OBJECT_IN_CREATE_ONLY_SAVING_MODE = 512;
  static CAN_NOT_CREATE_NEW_OBJECT_IN_UPDATE_ONLY_SAVING_MODE = 513;
  static UNKNOWN_QUERY_SELECTOR = 514;
  static UNKNOWN_SORT_OPERATOR = 515;
  static CAN_NOT_DELETE_OBJECT_WITHOUT_ID = 516;
  static CAN_NOT_DELETE_TWO_OBJECTS_WITH_SAME_ID = 517;
  static NOT_LOGGED_IN = 518;
  static INVALID_CHANGE_TYPE = 519;
  static SCHEMA_CONFORMANCE_ERROR = 520;
  static CLASS_NOT_IN_SCHEMA = 521;
  static NON_ALPHANUMERIC_CLOUD_FUNCTION_NAME = 522;
  static INCORRECT_MASTER_KEY = 523;

  // Client errors
  static STORAGE_UNDEFINED = 700;
  static SSL_REQUIRED = 702;
  static STILL_LOGGED_IN = 703;
  static UNINITIALIZED = 704;
  static ALREADY_INITIALIZED = 705;
  static MASTER_KEY_REQUIRED = 706;

  // Server & client errors
  static NON_ALPHANUMERIC_FIELD_NAME = 900;
  static NON_ALPHANUMERIC_FUNCTION_NAME = 901;
  static CAN_ONLY_INCREMENT_AND_DECREMENT_NUMBERS = 902;
  static CAN_ONLY_APPEND_TO_ARRAYS = 903;
  static READ_ONLY_USER = 904;

  static codeToMessage: { [code: number]: string } = {
    500: "User already exists",
    501: "Invalid email address",
    502: "Invalid password",
    503: "User already exists",
    504: "Can not convert non guest user",
    505: "Can not save two objects with the same _id",
    506: "No user with given email address",
    507: "Incorrect password",
    508: "Logout failed",
    509: "Invalid class name",
    510: "Unknown saving mode",
    511: "Object without _id in UPDATE_ONLY savingMode",
    512: "Can not overwrite object in CREATE_ONLY savingMode",
    513: "Can not create new objet in UPDATE_ONLY savingMode",
    514: "Unknown query selector",
    515: "Unknown sort operator",
    516: "Can not delete object without _id",
    517: "Can not delete two objects with the same _id",
    518: "Not logged in",
    519: "Invalid change type",
    520: "Schema conformance error",
    521: "Class not in schema",
    700: "Hotaru.initialize called with storage undefined",
    702: "Hotaru.initialize called with non-https url, set overrideSSLRequirement to true to override",
    703: "Can't log in or sign up when still logged in, log out first",
    704: "Call Hotaru.initialize before calling any other method",
    705: "Don't call Hotaru.initialize more than once",
    900: "Field names must be alphanumeric",
    901: "Cloud function names must be alphanumeric",
    902: "Can only increment and decrement number fields",
    903: "Can only increment number fields",
    904: "Trying to set value on a read-only user",
  };
}
