const { admin, db } = require('../util/admin');

const config = require('../util/config');
const firebase = require('firebase');
firebase.initializeApp(config);

const { validateSignUpData, validateLogInData, reduceUserDetails } = require('../util/validators');

exports.signup = (request, response) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        handle: request.body.handle,
    }

    const { valid, errors } = validateSignUpData(newUser);
    if(!valid) return response.status(400).json(errors);

    const defaultImg = 'default-img.jpg';

    let token, userId;
    db
        .doc(`/users/${newUser.handle}`).get()
        .then((doc) => {
            if(doc.exists){
                return response.status(400).json({ handle: 'This handle is already taken.' });
            }
            else{
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })
        .then((data)=> {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((idToken) => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/default-img.jpg?alt=media`,
                userId
            };
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return response.status(201).json({ token });
        })
        .catch((error) => {
            console.log(error);
            if(error.code === 'auth/email-already-in-use'){
                return response.status(400).json({ email: 'Email is already in use.'});
            }
            else{
                return response.status(500).json({ general: "Something went wrong, please try again." });
            }
        });
};

exports.login = (request, response) => {
    const user = {
        email: request.body.email,
        password: request.body.password
    }

    const { valid, errors } = validateLogInData(user);
    if(!valid) return response.status(400).json(errors);

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            return data.user.getIdToken();
        })
        .then((token) => {
            return response.json({token});
        })
        .catch((error) => {
            return response.status(403).json({ general: 'Wrong email/password combination.' });
        });
};

exports.addUserDetails = (request, response) => {
    let userDetails = reduceUserDetails(request.body);

    db
        .doc(`/users/${request.user.handle}`)
        .update(userDetails)
        .then(()=> {
            return response.json('Details added successfully.');
        })
        .catch(error => {
            return response.status(500).json({ error: error.code });
        })
};

exports.getUserDetails = (request, response) => {
    let userData = {};
    db
        .doc(`/users/${request.params.handle}`).get()
        .then(doc => {
            if(doc.exists) {
                userData.user = doc.data();
                return db.collection('internships').where('userHandle', '==', request.params.handle)
                    .orderBy('createdAt', 'desc').get();
            } else {
                return response.status(404).json({ error: "User not found." });
            }
        })
        .then(data => {
            userData.internships = [];
            data.forEach(doc => {
                userData.internships.push({
                    body: doc.data().body,
                    createdAt: doc.data().createdAt,
                    userHandle: doc.data().userHandle,
                    userImage: doc.data().userImage,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount,
                    internshipId: doc.id
                })
            });
            return response.json(userData);
        })
        .catch(error => {
            return response.status(500).json({ error: error.code });
        })
};

exports.getAuthenticatedUser = (request, response) => {
    let userData = {};
    db
        .doc(`/users/${request.user.handle}`).get()
        .then(doc => {
            if(doc.exists){
                userData.credentials = doc.data();
                return db.collection('likes').where('userHandle', '==', request.user.handle).get();
            }
        })
        .then(data => {
            userData.likes = [];
            data.forEach(doc => {
                userData.likes.push(doc.data());
            })
            return db.collection('notifications').where('recipient', '==', request.user.handle)
                .orderBy('createdAt', 'desc').limit(10).get();
        })
        .then((data) => {
            userData.notifications = [];
            data.forEach(doc => {
                userData.notifications.push({
                    recipient: doc.data().recipient,
                    createdAt:doc.data().createdAt,
                    sender: doc.data().sender,
                    read: doc.data().read,
                    internshipId: doc.data().internshipId,
                    type: doc.data().type,
                    notificationId: doc.id
                })
            });
            return response.json(userData);
        })
        .catch(error => {
            return response.status(500).json({ error: error.code });
        })
};

exports.uploadImage = (request, response) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({ headers: request.headers });

    let imageFileName, imageToBeUploaded = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if(mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
            return response.status(400).json({ error: 'Wrong file type submitted.'});
        }

        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        imageFileName = `${Math.round(Math.random() * 1000000000000).toString()}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath))
    });
    busboy.on('finish', () => {
        admin
            .storage()
            .bucket()
            .upload(imageToBeUploaded.filepath, {
                resumable: false,
                metadata: {
                    metadata: {
                        contentType: imageToBeUploaded.mimetype
                    }
                }
            })
            .then(() => {
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
                return db.doc(`/users/${request.user.handle}`).update({ imageUrl });
            })
            .then(() => {
                return response.json({ message: 'Image uploaded successfully.'});
            })
            .catch(error => {
                return res.status(500).json({ error: "something went wrong" });
            })
    });
    busboy.end(request.rawBody);
};

exports.markNotificationsRead = (request, response) => {
    let batch = db.batch();
    request.body.forEach(notificationId => {
        const notification = db.doc(`/notifications/${notificationId}`);
        batch.update(notification, { read: true });
    })
    batch
        .commit()
        .then(() => {
            return response.json({ message: 'Notifications marked read' });
        })
        .catch(error => {
            return res.status(500).json({ error: error.code });
        });
};