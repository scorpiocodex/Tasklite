process.env.PORT = '5001';
// In-memory sqlite for tests
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('./server');
const db = require('./database');

describe('TaskLite API', () => {
    beforeEach(() => {
        // Clear the tasks table before each test
        db.exec('DELETE FROM tasks');
    });

    afterAll(() => {
        // Close the DB connection
        db.close();
    });

    describe('GET /health', () => {
        it('returns 200 ok and version', async () => {
            const res = await request(app).get('/health');
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('POST /tasks', () => {
        it('creates a new task', async () => {
            const res = await request(app)
                .post('/tasks')
                .send({ title: 'Test Task' });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.title).toBe('Test Task');
            expect(res.body.completed).toBe(false);
            expect(res.body.position).toBe(1);
        });

        it('returns 400 for empty title', async () => {
            const res = await request(app)
                .post('/tasks')
                .send({ title: '   ' });

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toMatch(/empty/i);
        });

        it('returns 400 for missing title', async () => {
            const res = await request(app)
                .post('/tasks')
                .send({});

            expect(res.statusCode).toEqual(400);
        });
    });

    describe('GET /tasks', () => {
        it('returns empty array initially', async () => {
            const res = await request(app).get('/tasks');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual([]);
        });

        it('returns tasks ordered by position and id', async () => {
            await request(app).post('/tasks').send({ title: 'T1' });
            await request(app).post('/tasks').send({ title: 'T2' });

            const res = await request(app).get('/tasks');
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toBe(2);
            expect(res.body[0].title).toBe('T1');
            expect(res.body[1].title).toBe('T2');
        });

        it('filters tasks by search term', async () => {
            await request(app).post('/tasks').send({ title: 'Buy milk' });
            await request(app).post('/tasks').send({ title: 'Buy eggs' });
            await request(app).post('/tasks').send({ title: 'Read book' });

            const res = await request(app).get('/tasks?search=buy');
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toBe(2);
        });
    });

    describe('PUT /tasks/:id', () => {
        it('toggles task completion status', async () => {
            const createRes = await request(app).post('/tasks').send({ title: 'To Toggle' });
            const taskId = createRes.body.id;

            const res1 = await request(app).put(`/tasks/${taskId}`);
            expect(res1.statusCode).toEqual(200);
            expect(res1.body.completed).toBe(true);

            const res2 = await request(app).put(`/tasks/${taskId}`);
            expect(res2.statusCode).toEqual(200);
            expect(res2.body.completed).toBe(false);
        });
    });

    describe('PATCH /tasks/:id', () => {
        it('updates task title', async () => {
            const createRes = await request(app).post('/tasks').send({ title: 'Old Title' });
            const taskId = createRes.body.id;

            const res = await request(app)
                .patch(`/tasks/${taskId}`)
                .send({ title: 'New Title' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.title).toBe('New Title');
        });
    });

    describe('DELETE /tasks/:id', () => {
        it('deletes a task', async () => {
            const createRes = await request(app).post('/tasks').send({ title: 'To Delete' });
            const taskId = createRes.body.id;

            const delRes = await request(app).delete(`/tasks/${taskId}`);
            expect(delRes.statusCode).toEqual(200);

            const getRes = await request(app).get('/tasks');
            expect(getRes.body.length).toBe(0);
        });
    });

    describe('DELETE /tasks/completed', () => {
        it('deletes only completed tasks', async () => {
            await request(app).post('/tasks').send({ title: 'T1' });
            const createRes2 = await request(app).post('/tasks').send({ title: 'T2' });
            await request(app).put(`/tasks/${createRes2.body.id}`); // Complete T2

            const delRes = await request(app).delete(`/tasks/completed`);
            expect(delRes.statusCode).toEqual(200);

            const getRes = await request(app).get('/tasks');
            expect(getRes.body.length).toBe(1);
            expect(getRes.body[0].title).toBe('T1');
        });
    });

    describe('PUT /tasks/reorder', () => {
        it('reorders tasks by position', async () => {
            const c1 = await request(app).post('/tasks').send({ title: 'T1' });
            const c2 = await request(app).post('/tasks').send({ title: 'T2' });

            const res = await request(app)
                .put('/tasks/reorder')
                .send({ updates: [{ id: c1.body.id, position: 2 }, { id: c2.body.id, position: 1 }] });

            expect(res.statusCode).toEqual(200);

            const getRes = await request(app).get('/tasks');
            expect(getRes.body[0].title).toBe('T2');
            expect(getRes.body[1].title).toBe('T1');
        });
    });
});
