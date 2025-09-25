export const onRequest = async (context) => {
    const url = new URL(context.request.url);
    // pages.dev でアクセスされたら独自ドメインへ恒久リダイレクト
    if (url.hostname.endsWith('.pages.dev')) {
        const target = `https://akyodex.com${url.pathname}${url.search}`;
        return Response.redirect(target, 301);
    }
    return context.next();
};


