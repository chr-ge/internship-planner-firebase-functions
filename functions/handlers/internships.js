const { db } = require('../util/admin');

exports.getAllInternships = (request, response) => {
    db
        .collection('internships')
        .orderBy('createdAt', 'desc')
        .get()
            .then((data) => {
                let internships = [];
                data.forEach((doc) => {
                    internships.push({
                        internshipId: doc.id,
                        body: doc.data().body,
                        userHandle: doc.data().userHandle,
                        createdAt: doc.data().createdAt,
                        commentCount: doc.data().commentCount,
                        likeCount: doc.data().likeCount,
                        userImage: doc.data().userImage
                    });
                });
                return response.json(internships);
            })
            .catch((error) => response.status(500).json({ error: error.code }));
};

exports.createInternship = (request, response) => {
    if(request.body.body.trim() === '') {
        return response.status(400).json({ body: 'Body must not be empty' });
    }

    const newInternship = {
        body: request.body.body,
        userHandle: request.user.handle,
        userImage: request.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    };

    db
        .collection('internships')
        .add(newInternship)
        .then((doc) => {
            const responseInternship = newInternship;
            responseInternship.internshipId = doc.id;
            response.json(responseInternship);
        })
        .catch((error) => {
            response.status(500).json({ error: 'something went wrong'});
        });
};

exports.getInternship = (request, response) => {
    let internshipData= {};
    db
        .doc(`/internships/${request.params.internshipId}`)
        .get()
        .then((doc) => {
            if(!doc.exists){
                return response.status(404).json({ error: 'Internship not found.'});
            }
            internshipData = doc.data();
            internshipData.internshipId = doc.id;
            return db
                .collection('comments')
                .orderBy('createdAt', 'desc')
                .where('internshipId', '==', request.params.internshipId)
                .get();
        })
        .then((data) => {
            internshipData.comments = [];
            data.forEach((doc) => {
                internshipData.comments.push(doc.data())
            });
            return response.json(internshipData);
        })
        .catch((error) => {
            response.status(500).json({ error: error.code });
        });
};

exports.commentOnInternship = (request, response) => {
    if(request.body.body.trim() === '') 
        return response.status(400).json({ comment: 'Must not be empty.' });

    const newComment = {
        body: request.body.body,
        createdAt: new Date().toISOString(),
        internshipId: request.params.internshipId,
        userHandle: request.user.handle,
        userImage: request.user.imageUrl
    };

    db
        .doc(`/internships/${request.params.internshipId}`)
        .get()
        .then((doc) => {
            if(!doc.exists){
                return response.status(404).json({ error: 'Internship not found.'});
            }
            return doc.ref.update({ commentCount: doc.data().commentCount + 1 })
        })
        .then(() => {
            return db.collection('comments').add(newComment);
        })
        .then(() => {
            return response.json(newComment);
        })
        .catch((error) => {
            response.status(500).json({ error: 'Something went wrong.' });
        });
};

exports.likeInternship = (request, response) => {
    const likeDocument = db.collection('likes').where('userHandle', '==', request.user.handle)
        .where('internshipId', '==', request.params.internshipId).limit(1);
    
    const internshipDocument = db.doc(`/internships/${request.params.internshipId}`);

    let internshipData;
    internshipDocument.get()
    .then((doc) => {
        if(doc.exists){
            internshipData = doc.data();
            internshipData.internshipId = doc.id;
            return likeDocument.get();
        }
        return response.status(404).json({ error: 'Internship not found.'});
    })
    .then((data) => {
        if(data.empty){
            return db.collection('likes').add({
                internshipId: request.params.internshipId,
                userHandle: request.user.handle
            })
            .then(() => {
                internshipData.likeCount++;
                return internshipDocument.update({ likeCount: internshipData.likeCount });
            })
            .then(() => {
                return response.json(internshipData);
            })
        }
        else {
            return response.status(400).json({ error: "Internship already liked." });
        }
    })
    .catch((error) => {
        response.status(500).json({ error: error.code });
    });
};

exports.unlikeInternship = (request, response) => {
    const likeDocument = db.collection('likes').where('userHandle', '==', request.user.handle)
    .where('internshipId', '==', request.params.internshipId).limit(1);

    const internshipDocument = db.doc(`/internships/${request.params.internshipId}`);

    let internshipData;
    internshipDocument.get()
    .then((doc) => {
        if(doc.exists){
            internshipData = doc.data();
            internshipData.internshipId = doc.id;
            return likeDocument.get();
        }
        return response.status(404).json({ error: 'Internship not found.'});
    })
    .then((data) => {
        if(data.empty){
            return response.status(400).json({ error: "Internship not liked." });
        }
        else {
            return db.doc(`/likes/${data.docs[0].id}`).delete()
                .then(() => {
                    internshipData.likeCount--;
                    return internshipDocument.update({ likeCount: internshipData.likeCount });
                })
                .then(() => {
                    return response.json(internshipData);
                })
        }
    })
    .catch((error) => {
        response.status(500).json({ error: error.code });
    });
};

exports.deleteInternship = (request, response) => {
    const document = db.doc(`/internships/${request.params.internshipId}`);
    document
        .get()
        .then((doc) => {
            if(!doc.exists){
                return response.status(404).json({ error: "Internship not found." });
            }
            if(doc.data().userHandle !== request.user.handle){
                return response.status(403).json({ error: "Unauthorized" });
            } else {
                return document.delete();
            }
        })
        .then(() => {
            response.json({ message: "Internship deleted successfully."});
        })
        .catch((error) => {
            response.status(500).json({ error: error.code });
        });
};