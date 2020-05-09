const functions = require('firebase-functions');
const app = require('express')();
const FBAuth = require('./util/fbAuth');
const { db } = require('./util/admin');

const { 
    getAllInternships,
    createInternship,
    getInternship,
    deleteInternship,
    commentOnInternship,
    likeInternship,
    unlikeInternship } = require('./handlers/internships');

const { 
    signup,
    login,
    uploadImage,
    addUserDetails, 
    getAuthenticatedUser, 
    getUserDetails, 
    markNotificationsRead } = require('./handlers/users');

//INTERNSHIP ROUTES
app.get('/internships', getAllInternships)
app.post('/createInternship', FBAuth, createInternship);
app.get('/internship/:internshipId', getInternship);
app.delete('/internship/:internshipId', FBAuth, deleteInternship)
app.get('/internship/:internshipId/like', FBAuth, likeInternship)
app.get('/internship/:internshipId/unlike', FBAuth, unlikeInternship)
app.post('/internship/:internshipId/comment', FBAuth, commentOnInternship);

//USERS ROUTES
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead)

exports.api = functions.region('us-east4').https.onRequest(app);

exports.createNotificationOnLike = functions.region('us-east4')
    .firestore.document('likes/{id}')
    .onCreate((snapshot) => {
        return db.doc(`/internships/${snapshot.data().internshipId}`).get()
            .then((doc) => {
                if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        read: false,
                        internshipId: doc.id,
                        type: 'like',
                    });
                }
            })
            .catch(error => console.error(error));
    });

exports.deleteNotificationOnUnLike = functions.region('us-east4')
    .firestore.document('likes/{id}')
    .onDelete((snapshot) => {
        return db.doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch(error => console.error(error));
    });

exports.createNotificationOnComment = functions.region('us-east4')
    .firestore.document('comments/{id}')
    .onCreate((snapshot) => {
        return db.doc(`/internships/${snapshot.data().internshipId}`).get()
        .then((doc) => {
            if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
                return db.doc(`/notifications/${snapshot.id}`).set({
                    createdAt: new Date().toISOString(),
                    recipient: doc.data().userHandle,
                    sender: snapshot.data().userHandle,
                    read: false,
                    internshipId: doc.id,
                    type: 'comment',
                });
            }
        })
        .catch(error => console.error(error));
    });

exports.onUserImageChange = functions.region('us-east4')
    .firestore.document('users/{userId}')
    .onUpdate((change) => {
        if(change.before.data().imageUrl !== change.after.data().imageUrl){
            const batch = db.batch();
            return db.collection('internships')
                .where('userHandle', '==', change.before.data().handle).get()
                .then((data) => {
                    data.forEach(doc => {
                        const internship = db.doc(`/internships/${doc.id}`);
                        batch.update(internship, { userImage: change.after.data().imageUrl });
                    });
                    return batch.commit();
                });
        } else {
            return true;
        }
    });

exports.onInternshipDelete = functions.region('us-east4')
    .firestore.document('internships/{internshipId}')
    .onDelete((snapshot, context) => {
        const internshipId = context.params.internshipId;
        const batch = db.batch();
        return db.collection('comments')
            .where('internshipId', '==', internshipId).get()
            .then((data) => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/comments/${doc.id}`));
                })
                return db.collection('likes').where('internshipId', '==', internshipId).get();
            })
            .then((data) => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/likes/${doc.id}`));
                })
                return db.collection('notifications').where('internshipId', '==', internshipId).get();
            })
            .then((data) => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/notifications/${doc.id}`));
                })
                return batch.commit();
            })
            .catch(error => console.error(error));
    });