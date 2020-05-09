let db = {
    users: [
        {
            userId: 'QtbdrMQuf5Yaod3Rk6GFph2cO5x2',
            email: 'user@gmail.com',
            handle: 'user',
            createdAt: '2020-05-08T03:51:32.157Z',
            imageUrl: 'image/asdasdasd',
            bio: 'Hello, my name is user, nice to meet you.',
            website: 'https://user.com',
            location: 'Montreal, Qc'
        }
    ],
    internships: [
        {
            userHandle: 'user',
            body: 'this is the internship body',
            createdAt: '2020-05-08T03:51:32.157Z',
            likeCount: 5,
            commentCount: 2
        }
    ],
    comments: [
        {
            userHandle: 'user',
            internshipId: 'ytbdrwQufrYaod3Rk6GFph2cO5x2',
            body: 'seems awesome',
            createdAt: '2020-05-08T03:51:32.157Z',
        }
    ],
    notifications: [
        {
            recipient: 'user',
            sender: 'john',
            read: 'true | false',
            internshipId: 'ytbdrwQufrYaod3Rk6GFph2cO5x2',
            type: 'like | comment',
            createdAt: '2020-05-09T03:51:32.157Z'
        }
    ]
}
const userDetails = {
    //Redux Data
    credentials: {
        userId: 'QtbdrMQuf5Yaod3Rk6GFph2cO5x2',
        email: 'user@gmail.com',
        handle: 'user',
        createdAt: '2020-05-08T03:51:32.157Z',
        imageUrl: 'image/asdasdasd',
        bio: 'Hello, my name is user, nice to meet you.',
        website: 'https://user.com',
        location: 'Montreal, Qc'
    },
    likes: [
        {
            userHandle: 'user',
            internshipId: 'QwedrMQuf5Yao23Rk6GFph2123x2'
        },
        {
            userHandle: 'user',
            internshipId: '233drMQuf5Yao23Rk6GFph211232'
        }
    ]
}