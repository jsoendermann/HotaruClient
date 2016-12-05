/// <reference path="../typings/globals/jest/index.d.ts" />
/// <reference path="../typings/globals/node/index.d.ts" />

const HOTARU_IMPORT_PATH = '../src/';

describe('Hotaru', function () {
  beforeEach(async function () {
    jest.resetModules();
  });

  it('should log in as guest', async function () {
    const { Hotaru } = require(HOTARU_IMPORT_PATH);

    await Hotaru.initialize({
      serverUrl: 'https://example.com',
      requestFunction: (url: string, params: any) => ({
        "sessionId": "lRkXVA01pg5cWAHtORrZwGqtjc4IMhpw",
        "userData": { "_id": "tBD4B2wA8IL2AF0", "email": null, "createdAt": "2016-12-05T17:52:39.499Z", "updatedAt": "2016-12-05T17:52:39.504Z" }
      })
    });

    await Hotaru.logInAsGuest();

    const _id = Hotaru.currentUser().get('_id');
    expect(_id).toMatch(/^[a-zA-Z0-9]{15}$/);
  });

  it('should sign up guest users', async function () {
    const { Hotaru } = require(HOTARU_IMPORT_PATH);

    var requestFunction = jest.fn();

    requestFunction
      .mockReturnValueOnce({ // To log in as guest
        "sessionId": "lRkXVA01pg5cWAHtORrZwGqtjc4IMhpw",
        "userData": { "_id": "tBD4B2wA8IL2AF0", "email": null, "createdAt": "2016-12-05T17:52:39.499Z", "updatedAt": "2016-12-05T17:52:39.504Z" }
      })
      .mockReturnValueOnce({ // To synchronize user
        "userData": { "_id": "tBD4B2wA8IL2AF0", "email": null, "createdAt": "2016-12-05T17:52:39.499Z", "updatedAt": "2016-12-05T17:52:39.504Z" }
      })
      .mockReturnValueOnce({ // To convert the guest user
        "userData":{"_id":"tBD4B2wA8IL2AF0","email":"testmail@bla.com","createdAt":"2016-12-05T18:08:46.579Z","updatedAt":"2016-12-05T18:09:21.356Z"}
      });

    await Hotaru.initialize({
      serverUrl: 'https://example.com',
      requestFunction
    });

    await Hotaru.logInAsGuest();

    const user = Hotaru.currentUser();
    expect(user.isGuest()).toBeTruthy();

    await Hotaru.convertGuestUser('email@example.com', 'password');
    expect(user.isGuest()).toBeFalsy();
  });
});
